"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClientOnly;
const react_1 = require("react");
function ClientOnly({ children, fallback = null, }) {
    const [hasMounted, setHasMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setHasMounted(true);
    }, []);
    if (!hasMounted) {
        return <>{fallback}</>;
    }
    return <>{children}</>;
}
