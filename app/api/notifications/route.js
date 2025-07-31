import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { notificationService } from '@/lib/notifications/notification-service';

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Get user notifications
    const notifications = await notificationService.getUserNotifications(userId, limit);
    
    // Filter unread notifications if requested
    const filteredNotifications = unreadOnly 
      ? notifications.filter(n => !n.read)
      : notifications;

    return NextResponse.json({
      success: true,
      data: filteredNotifications,
      count: filteredNotifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'mark_read':
        await notificationService.markNotificationAsRead(notificationId);
        break;
      
      case 'mark_all_read':
        // Mark all notifications as read
        const notifications = await notificationService.getUserNotifications(userId, 1000);
        const unreadNotifications = notifications.filter(n => !n.read);
        
        for (const notification of unreadNotifications) {
          await notificationService.markNotificationAsRead(notification.id);
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Notification ${action} successful`
    });

  } catch (error) {
    console.error('PUT /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, data, priority = 'normal' } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ 
        error: 'Type, title, and message are required' 
      }, { status: 400 });
    }

    // Validate notification type
    const validTypes = ['trade', 'system', 'alert', 'info'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid notification type',
        validTypes 
      }, { status: 400 });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: 'Invalid priority level',
        validPriorities 
      }, { status: 400 });
    }

    // Create notification
    const notification = {
      user_id: userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      read: false,
      created_at: new Date().toISOString()
    };

    // Store notification in database
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    
    const { data: createdNotification, error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Send real-time notification if priority is high or urgent
    if (priority === 'high' || priority === 'urgent') {
      try {
        await notificationService.sendSystemAlert(userId, {
          type: title,
          message,
          severity: priority === 'urgent' ? 'high' : 'medium'
        });
      } catch (error) {
        console.error('Failed to send real-time notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: createdNotification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clear_all') {
      // Clear all notifications for user
      const { supabaseAdmin } = await import('@/lib/supabase/client');
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to clear notifications:', error);
        return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications cleared successfully'
      });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    // Delete specific notification
    const { supabaseAdmin } = await import('@/lib/supabase/client');
    
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete notification:', error);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}