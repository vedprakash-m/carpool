'use client';

import React from 'react';
import Link from 'next/link';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRBAC } from '@/contexts/RBACContext';
import { RolePermissions } from '@/types/shared';
import {
  Users,
  Settings,
  Shield,
  Building2,
  Calendar,
  ClipboardList,
  UserCheck,
  Activity,
  FileText,
  ChevronRight,
} from 'lucide-react';

type AdminPermissions = RolePermissions['admin'];

interface AdminCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  permission?: keyof AdminPermissions;
}

const adminCards: AdminCard[] = [
  {
    title: 'Role Management',
    description:
      'Promote parents to Group Admin, manage user roles and permissions.',
    href: '/admin/roles',
    icon: <Shield className="h-6 w-6" />,
    permission: 'group_admin_promotion',
  },
  {
    title: 'Group Management',
    description:
      'View all carpool groups, manage group settings and membership.',
    href: '/admin/groups',
    icon: <Users className="h-6 w-6" />,
    permission: 'platform_management',
  },
  {
    title: 'School Configuration',
    description: 'Configure schools, service areas, and geographic boundaries.',
    href: '/admin/school-config',
    icon: <Building2 className="h-6 w-6" />,
    permission: 'system_configuration',
  },
  {
    title: 'Driver Selection',
    description: 'Review and select drivers for carpool assignments.',
    href: '/admin/drivers',
    icon: <UserCheck className="h-6 w-6" />,
    permission: 'platform_management',
  },
  {
    title: 'Schedule Templates',
    description: 'Create and manage scheduling templates for carpool groups.',
    href: '/admin/templates',
    icon: <FileText className="h-6 w-6" />,
    permission: 'platform_management',
  },
  {
    title: 'Scheduling',
    description: 'Manage weekly schedules and trip assignments.',
    href: '/admin/scheduling',
    icon: <Calendar className="h-6 w-6" />,
    permission: 'platform_management',
  },
  {
    title: 'Join Requests',
    description: 'Review and approve pending group join requests.',
    href: '/admin/join-review',
    icon: <ClipboardList className="h-6 w-6" />,
    permission: 'platform_management',
  },
];

export default function AdminDashboard() {
  const { permissions } = useRBAC();
  const adminPermissions = permissions as AdminPermissions | null;

  // Filter cards based on permissions
  const visibleCards = adminCards.filter(
    card =>
      !card.permission ||
      (adminPermissions && adminPermissions[card.permission])
  );

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Super Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Platform administration and oversight for Carpool.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      System Status
                    </p>
                    <p className="text-2xl font-bold text-green-600">Healthy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Group Admins
                    </p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Groups
                    </p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Navigation Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Administration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleCards.map(card => (
                <Link key={card.href} href={card.href}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          {card.icon}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <CardTitle className="mt-4">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Monitoring Section */}
          {adminPermissions?.platform_management && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Platform Monitoring
                </h2>
                <Link href="/admin/monitoring">
                  <Button variant="outline" size="sm">
                    View Full Dashboard
                  </Button>
                </Link>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">
                        API Health
                      </p>
                      <p className="text-3xl font-bold text-green-600">99.9%</p>
                      <p className="text-xs text-green-600">Uptime</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">
                        Response Time
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        &lt;100ms
                      </p>
                      <p className="text-xs text-blue-600">Average</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-700">
                        Error Rate
                      </p>
                      <p className="text-3xl font-bold text-purple-600">0.1%</p>
                      <p className="text-xs text-purple-600">Last 24h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {adminPermissions?.group_admin_promotion && (
                <Link href="/admin/roles">
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Promote Group Admin
                  </Button>
                </Link>
              )}
              {adminPermissions?.platform_management && (
                <Link href="/admin/join-review">
                  <Button variant="outline">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Review Join Requests
                  </Button>
                </Link>
              )}
              {adminPermissions?.system_configuration && (
                <Link href="/admin/school-config">
                  <Button variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Configure Schools
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
