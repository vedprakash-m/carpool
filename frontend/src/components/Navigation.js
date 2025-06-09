"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Navigation;
const navigation_1 = require("next/navigation");
const auth_store_1 = require("@/store/auth.store");
const outline_1 = require("@heroicons/react/24/outline");
const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: outline_1.HomeIcon },
    { name: 'My Trips', href: '/trips', icon: outline_1.CalendarIcon },
    { name: 'Profile', href: '/profile', icon: outline_1.UserCircleIcon },
];
function Navigation() {
    const router = (0, navigation_1.useRouter)();
    const pathname = (0, navigation_1.usePathname)();
    const { user, logout } = (0, auth_store_1.useAuthStore)();
    const handleLogout = () => {
        logout();
        router.push('/');
    };
    const handleCreateTrip = () => {
        router.push('/trips/create');
    };
    return (<nav className="bg-white shadow-sm border-r border-gray-200">
      <div className="px-4 py-6">
        {/* Logo */}
        <div className="flex items-center mb-8">
          <outline_1.TruckIcon className="h-8 w-8 text-primary-600"/>
          <span className="ml-2 text-xl font-bold text-gray-900">VCarpool</span>
        </div>

        {/* User Info */}
        {user && (<div className="mb-8 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          </div>)}

        {/* Quick Actions */}
        <div className="mb-6">
          <button onClick={handleCreateTrip} className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <outline_1.PlusIcon className="h-4 w-4 mr-2"/>
            Create Trip
          </button>
        </div>

        {/* Navigation Links */}
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (<li key={item.name}>
                <button onClick={() => router.push(item.href)} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <Icon className="h-5 w-5 mr-3"/>
                  {item.name}
                </button>
              </li>);
        })}
        </ul>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors">
            <outline_1.ArrowRightOnRectangleIcon className="h-5 w-5 mr-3"/>
            Sign Out
          </button>
        </div>
      </div>
    </nav>);
}
