import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { tradingEngine } from '@/lib/trading/trading-engine';
import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      botId,
      action,
      orderParams
    } = body;

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    try {
      let result;

      switch (action) {
        case 'execute_signal':
          if (!orderParams) {
            return NextResponse.json({ error: 'Order parameters are required' }, { status: 400 });
          }
          result = await executeSignal(botId, orderParams);
          break;

        case 'close_position':
          const { positionId, exitPrice, reason } = orderParams;
          if (!positionId) {
            return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
          }
          result = await closePosition(botId, positionId, exitPrice, reason);
          break;

        case 'modify_position':
          const { positionId: modPositionId, updates } = orderParams;
          if (!modPositionId || !updates) {
            return NextResponse.json({ error: 'Position ID and updates are required' }, { status: 400 });
          }
          result = await modifyPosition(botId, modPositionId, updates);
          break;

        case 'cancel_order':
          const { orderId } = orderParams;
          if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
          }
          result = await cancelOrder(botId, orderId);
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      // Send notification for successful trade execution
      if (result && result.trade) {
        await notificationService.sendTradeNotification(userId, result.trade);
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: `Trade ${action} executed successfully`
      });

    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      
      // Send system alert for failed trade execution
      await notificationService.sendSystemAlert(userId, {
        type: 'Trade Execution Failed',
        message: `Failed to ${action}: ${error.message}`,
        severity: 'high'
      });

      return NextResponse.json({
        error: `Failed to ${action}`,
        details: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('POST /api/trading/execute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function executeSignal(botId, orderParams) {
  const bot = await tradingEngine.getBotStatus(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }

  if (bot.status !== 'running') {
    throw new Error('Bot is not running');
  }

  const {
    direction,
    price,
    lotSize,
    stopLoss,
    takeProfit,
    confidence
  } = orderParams;

  // Validate order parameters
  if (!direction || !price || !lotSize) {
    throw new Error('Missing required order parameters');
  }

  if (!['BUY', 'SELL'].includes(direction)) {
    throw new Error('Invalid direction. Must be BUY or SELL');
  }

  if (lotSize <= 0) {
    throw new Error('Lot size must be greater than 0');
  }

  if (price <= 0) {
    throw new Error('Price must be greater than 0');
  }

  // Execute the trade through trading engine
  const trade = await tradingEngine.executeSignal(bot, {
    direction,
    price,
    lotSize,
    stopLoss,
    takeProfit,
    confidence
  });

  return {
    trade,
    message: `${direction} order executed successfully`
  };
}

async function closePosition(botId, positionId, exitPrice, reason = 'manual') {
  const bot = await tradingEngine.getBotStatus(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }

  const position = bot.positions.find(p => p.id === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  if (position.status === 'closed') {
    throw new Error('Position is already closed');
  }

  // Close position through trading engine
  const closedPosition = await tradingEngine.closePosition(bot, positionId, exitPrice, reason);

  return {
    trade: closedPosition,
    message: 'Position closed successfully'
  };
}

async function modifyPosition(botId, positionId, updates) {
  const bot = await tradingEngine.getBotStatus(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }

  const position = bot.positions.find(p => p.id === positionId);
  if (!position) {
    throw new Error('Position not found');
  }

  if (position.status === 'closed') {
    throw new Error('Cannot modify closed position');
  }

  // Validate updates
  const allowedUpdates = ['stopLoss', 'takeProfit'];
  const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
  
  if (invalidUpdates.length > 0) {
    throw new Error(`Invalid updates: ${invalidUpdates.join(', ')}`);
  }

  // Update position through trading engine
  const updatedPosition = await tradingEngine.modifyPosition(bot, positionId, updates);

  return {
    trade: updatedPosition,
    message: 'Position modified successfully'
  };
}

async function cancelOrder(botId, orderId) {
  const bot = await tradingEngine.getBotStatus(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }

  const order = bot.orders.find(o => o.id === orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'filled' || order.status === 'cancelled') {
    throw new Error('Order cannot be cancelled');
  }

  // Cancel order through trading engine
  const cancelledOrder = await tradingEngine.cancelOrder(bot, orderId);

  return {
    trade: cancelledOrder,
    message: 'Order cancelled successfully'
  };
}

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Get bot status and positions
    const botStatus = await tradingEngine.getBotStatus(botId);
    if (!botStatus) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        bot: botStatus,
        positions: botStatus.positions,
        performance: botStatus.performance,
        lastUpdate: botStatus.lastUpdate
      }
    });

  } catch (error) {
    console.error('GET /api/trading/execute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}