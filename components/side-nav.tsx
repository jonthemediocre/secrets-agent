'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { navigationItems, navigationGroups } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BellIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SideNavProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function SideNav({ isDarkMode, toggleTheme }: SideNavProps) {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-30">
      {/* Logo Section */}
      <div className="flex items-center px-6 py-4 border-b border-border">
        <div className="w-10 h-10 mr-3 flex items-center justify-center relative">
          <Image 
            src="/logo.png" 
            alt="Secrets Agent Logo" 
            width={40} 
            height={40}
            className="object-contain drop-shadow-sm hover:scale-105 transition-transform duration-200"
            priority
          />
        </div>
        <div>
          <h1 className="font-semibold text-sm">Secrets Agent</h1>
          <p className="text-xs text-muted-foreground">Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-140px)] px-3 py-4">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.id}>
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.name}
                  </h3>
                </div>
                <div className="space-y-1">
                  {navigationItems
                    .filter(item => item.group === group.id)
                    .map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            buttonVariants({
                              variant: pathname === item.href ? 'default' : 'ghost',
                              size: 'sm',
                            }),
                            'w-full justify-start h-9 text-sm group'
                          )}
                        >
                          <item.icon className="w-4 h-4 mr-3 group-hover:scale-105 transition-transform" />
                          {item.name}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={5}>
                        {item.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="sm"
            className="flex-1 h-8"
          >
            {isDarkMode ? (
              <>
                <SunIcon className="w-3 h-3 mr-1" />
                Light
              </>
            ) : (
              <>
                <MoonIcon className="w-3 h-3 mr-1" />
                Dark
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 h-8 w-8 p-0 relative" 
            onClick={() => {
              // Mock notification action
              alert('Notifications: 3 new security alerts, 2 completed harvests, 1 vault sync pending')
            }}
          >
            <BellIcon className="w-3 h-3" />
            {/* Notification indicator */}
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
        </div>
        <div className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">AC</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Alex Chen</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
} 