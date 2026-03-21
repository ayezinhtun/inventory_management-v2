import React from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell, Wrench, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
export function NotificationsPage() {
  const {
    notifications,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    navigate
  } = useStore();
  if (!currentUser) return null;
  const userNotifications = notifications.
  filter((n) => n.user_id === currentUser.id).
  sort(
    (a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const unreadCount = userNotifications.filter((n) => !n.is_read).length;
  const getIcon = (type: string) => {
    switch (type) {
      case 'install':
        return <Wrench className="h-5 w-5 text-blue-500" />;
      case 'relocation':
        return <ArrowRightLeft className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markNotificationRead(notification.id);
    }
    // Navigate based on type
    if (notification.related_request_type === 'install') {
      if (currentUser.role === 'PM') navigate('install-pm');else
      if (currentUser.role === 'Admin') navigate('install-admin');else
      navigate('install-requests');
    } else if (notification.related_request_type === 'relocation') {
      if (currentUser.role === 'PM') navigate('relocation-pm');else
      if (currentUser.role === 'Admin') navigate('relocation-admin');else
      navigate('relocation-requests');
    }
  };
  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            You have {unreadCount} unread notification
            {unreadCount !== 1 ? 's' : ''}
          </p>
        </div>

        {unreadCount > 0 &&
        <Button variant="outline" onClick={markAllNotificationsRead}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        }
      </div>

      <div className="space-y-4">
        {userNotifications.length > 0 ?
        userNotifications.map((notification) =>
        <Card
          key={notification.id}
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
          onClick={() => handleNotificationClick(notification)}>
          
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="mt-1 bg-background p-2 rounded-full border shadow-sm">
                  {getIcon(notification.notification_type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p
                className={`text-sm ${!notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read &&
            <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
            }
              </CardContent>
            </Card>
        ) :

        <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">All caught up!</p>
            <p>You have no notifications at this time.</p>
          </div>
        }
      </div>
    </div>);

}