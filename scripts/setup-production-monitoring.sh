#!/bin/bash

# VCarpool Production Monitoring Setup Script
# Configures Application Insights, alerts, and health checks for production

set -e

echo "📊 VCarpool Production Monitoring Setup"
echo "======================================="

# Configuration
RESOURCE_GROUP="vcarpool-rg"
FUNCTION_APP_NAME="vcarpool-api-prod"
STATIC_WEB_APP_NAME="vcarpool-web-prod"
COSMOS_DB_NAME="vcarpool-cosmos-prod"
APP_INSIGHTS_NAME="vcarpool-insights-prod"
ACTION_GROUP_NAME="vcarpool-alerts"

# Email for alerts
read -p "Enter email for production alerts: " ALERT_EMAIL

echo "🔍 Setting up Application Insights..."

# Create Application Insights if it doesn't exist
if ! az monitor app-insights component show \
    --app $APP_INSIGHTS_NAME \
    --resource-group $RESOURCE_GROUP &> /dev/null; then
    
    echo "Creating Application Insights..."
    az monitor app-insights component create \
        --app $APP_INSIGHTS_NAME \
        --location "West US 2" \
        --resource-group $RESOURCE_GROUP \
        --application-type web \
        --retention-time 90
fi

# Get Application Insights instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
    --app $APP_INSIGHTS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query instrumentationKey -o tsv)

echo "🔧 Configuring Function App with Application Insights..."
az functionapp config appsettings set \
    --name $FUNCTION_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY" \
        "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$INSTRUMENTATION_KEY" \
        "ApplicationInsightsAgent_EXTENSION_VERSION=~3" \
    > /dev/null

echo "📧 Setting up alert action group..."
az monitor action-group create \
    --name $ACTION_GROUP_NAME \
    --resource-group $RESOURCE_GROUP \
    --short-name "VCarpool" \
    --email-receivers \
        name=admin \
        email=$ALERT_EMAIL \
    > /dev/null

echo "🚨 Creating critical alerts..."

# High error rate alert
az monitor metrics alert create \
    --name "High Error Rate" \
    --resource-group $RESOURCE_GROUP \
    --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
    --condition "avg exceptions/server > 10" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action $ACTION_GROUP_NAME \
    --description "Alert when error rate exceeds 10 errors in 5 minutes" \
    --severity 2

# High response time alert
az monitor metrics alert create \
    --name "High Response Time" \
    --resource-group $RESOURCE_GROUP \
    --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME" \
    --condition "avg requests/duration > 2000" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action $ACTION_GROUP_NAME \
    --description "Alert when average response time exceeds 2 seconds" \
    --severity 3

# Database connection issues alert
az monitor metrics alert create \
    --name "Database Connection Failures" \
    --resource-group $RESOURCE_GROUP \
    --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/vcarpool-db-rg/providers/Microsoft.DocumentDB/databaseAccounts/$COSMOS_DB_NAME" \
    --condition "total TotalRequestUnits > 400" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action $ACTION_GROUP_NAME \
    --description "Alert when database throughput is consistently high" \
    --severity 2

echo "📊 Setting up custom telemetry queries..."

# Create custom queries for business metrics
cat > production-queries.kql << 'EOF'
// User Registration Success Rate
requests
| where name contains "auth-register"
| summarize 
    TotalRegistrations = count(),
    SuccessfulRegistrations = countif(resultCode == 200),
    SuccessRate = round(100.0 * countif(resultCode == 200) / count(), 2)
by bin(timestamp, 1h)
| order by timestamp desc

// Address Validation Performance
requests
| where name contains "address-validation"
| summarize 
    TotalValidations = count(),
    SuccessfulValidations = countif(resultCode == 200),
    AverageResponseTime = avg(duration),
    MaxResponseTime = max(duration)
by bin(timestamp, 1h)
| order by timestamp desc

// Active Users by Hour
requests
| where name contains "users-me" or name contains "dashboard"
| extend UserId = tostring(customDimensions.UserId)
| where isnotempty(UserId)
| summarize UniqueUsers = dcount(UserId) by bin(timestamp, 1h)
| order by timestamp desc

// Trip Creation Success Rate
requests
| where name contains "trips-create"
| summarize 
    TotalTripCreations = count(),
    SuccessfulCreations = countif(resultCode == 200),
    SuccessRate = round(100.0 * countif(resultCode == 200) / count(), 2)
by bin(timestamp, 1h)
| order by timestamp desc

// Critical Errors by Function
exceptions
| summarize ErrorCount = count() by operation_Name, type
| order by ErrorCount desc
| take 20
EOF

echo "📈 Creating Application Insights dashboard..."
cat > monitoring-dashboard.json << EOF
{
  "properties": {
    "lenses": {
      "0": {
        "order": 0,
        "parts": {
          "0": {
            "position": {"x": 0, "y": 0, "colSpan": 6, "rowSpan": 4},
            "metadata": {
              "inputs": [{
                "name": "resourceTypeMode",
                "value": "application_insights"
              }, {
                "name": "ComponentId",
                "value": "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/components/$APP_INSIGHTS_NAME"
              }],
              "type": "Extension/AppInsightsExtension/PartType/MetricChartPart"
            }
          },
          "1": {
            "position": {"x": 6, "y": 0, "colSpan": 6, "rowSpan": 4},
            "metadata": {
              "inputs": [{
                "name": "query",
                "value": "requests | summarize RequestCount = count() by bin(timestamp, 1h) | order by timestamp desc"
              }],
              "type": "Extension/AppInsightsExtension/PartType/AnalyticsQueryPart"
            }
          }
        }
      }
    }
  }
}
EOF

echo "🔄 Setting up health check endpoints..."
cat > ../backend/health-check/function.json << 'EOF'
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
EOF

cat > ../backend/health-check/index.js << 'EOF'
const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {}
    };

    try {
        // Check database connectivity
        const cosmosClient = new CosmosClient({
            endpoint: process.env.COSMOS_DB_ENDPOINT,
            key: process.env.COSMOS_DB_KEY
        });
        
        await cosmosClient.database(process.env.COSMOS_DB_DATABASE).container('users').items.query('SELECT TOP 1 * FROM c').fetchNext();
        healthStatus.services.database = 'healthy';
    } catch (error) {
        healthStatus.services.database = 'unhealthy';
        healthStatus.status = 'unhealthy';
        healthStatus.errors = healthStatus.errors || [];
        healthStatus.errors.push(`Database: ${error.message}`);
    }

    try {
        // Check external API availability (sample check)
        if (process.env.GOOGLE_MAPS_API_KEY) {
            healthStatus.services.geocoding = 'configured';
        } else {
            healthStatus.services.geocoding = 'not configured';
        }
    } catch (error) {
        healthStatus.services.geocoding = 'error';
    }

    // Add system information
    healthStatus.system = {
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };

    context.res = {
        status: healthStatus.status === 'healthy' ? 200 : 503,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        },
        body: healthStatus
    };
};
EOF

echo "🔍 Setting up availability tests..."
az monitor app-insights web-test create \
    --resource-group $RESOURCE_GROUP \
    --name "VCarpool Health Check" \
    --location "West US 2" \
    --web-test-name "vcarpool-health-check" \
    --url-to-test "https://$FUNCTION_APP_NAME.azurewebsites.net/api/health-check" \
    --frequency 300 \
    --timeout 30 \
    --enabled true \
    --retry-enabled true \
    --locations "us-west-2" "us-east-1" "europe-west"

echo "📝 Creating monitoring runbook..."
cat > PRODUCTION_MONITORING_RUNBOOK.md << 'EOF'
# VCarpool Production Monitoring Runbook

## 🚨 Alert Response Procedures

### High Error Rate Alert
**Threshold**: >10 errors in 5 minutes
**Actions**:
1. Check Application Insights for error details
2. Identify failing function(s)
3. Check Azure Function logs
4. Verify external API status (Google Maps, etc.)
5. If widespread: consider temporary maintenance mode

### High Response Time Alert  
**Threshold**: >2 seconds average response time
**Actions**:
1. Check Cosmos DB metrics for throttling
2. Review Function App scaling metrics
3. Check for database query performance
4. Monitor concurrent user load

### Database Connection Failures
**Threshold**: Consistently high RU consumption
**Actions**:
1. Check Cosmos DB metrics
2. Review query performance
3. Check for connection pool exhaustion
4. Consider scaling database throughput

## 📊 Key Performance Indicators

### Business Metrics
- User registration success rate: >95%
- Address validation success rate: >98%
- Trip creation success rate: >99%
- Average response time: <500ms

### Technical Metrics
- Function availability: >99.9%
- Database availability: >99.9%
- Error rate: <1%
- Memory usage: <80%

## 🔧 Common Troubleshooting

### Address Validation Failures
1. Check Google Maps API quota
2. Verify Azure Maps API status
3. Review geocoding service logs
4. Check for invalid address formats

### Authentication Issues
1. Verify JWT secret configuration
2. Check Azure Key Vault access
3. Review token expiration settings
4. Monitor failed login attempts

### Database Performance
1. Check RU consumption patterns
2. Review indexing strategy
3. Monitor query performance
4. Check connection pooling

## 📞 Escalation Contacts

- **Level 1**: Development Team
- **Level 2**: Platform Team  
- **Level 3**: Azure Support

## 🔄 Regular Maintenance Tasks

### Daily
- Review error logs
- Check performance metrics
- Monitor user activity

### Weekly  
- Review capacity planning
- Check security alerts
- Update monitoring queries

### Monthly
- Performance optimization review
- Cost analysis
- Security assessment
EOF

echo "✅ Production monitoring setup complete!"
echo
echo "📋 Configuration Summary:"
echo "- Application Insights: $APP_INSIGHTS_NAME"
echo "- Alert Action Group: $ACTION_GROUP_NAME"
echo "- Health Check Endpoint: /api/health-check"
echo "- Custom Queries: production-queries.kql"
echo "- Monitoring Runbook: PRODUCTION_MONITORING_RUNBOOK.md"
echo
echo "🎯 Next Steps:"
echo "1. Review and customize alert thresholds"
echo "2. Test health check endpoint"
echo "3. Configure additional business metric alerts"
echo "4. Set up automated incident response procedures"
echo "5. Schedule regular monitoring reviews" 