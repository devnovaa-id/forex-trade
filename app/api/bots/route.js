import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { validateBotConfig } from '@/lib/utils/validation';
import { tradingEngine } from '@/lib/trading/trading-engine';
import { notificationService } from '@/lib/notifications/notification-service';

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const strategy = searchParams.get('strategy');

    // Get bots from database
    let query = supabaseAdmin
      .from('trading_bots')
      .select(`
        *,
        bot_performance (
          total_trades,
          winning_trades,
          total_profit,
          win_rate,
          max_drawdown,
          sharpe_ratio
        )
      `)
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    if (strategy) {
      query = query.eq('strategy_type', strategy);
    }

    const { data: dbBots, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bots from database:', error);
      return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
    }

    // Get real-time status from trading engine
    const activeBots = await tradingEngine.getAllBotsStatus();
    const activeBotsMap = new Map(activeBots.map(bot => [bot.id, bot]));

    // Merge database data with real-time status
    const bots = dbBots.map(dbBot => {
      const activeBot = activeBotsMap.get(dbBot.id);
      return {
        ...dbBot,
        real_time_status: activeBot ? activeBot.status : 'stopped',
        real_time_performance: activeBot ? activeBot.performance : null,
        real_time_positions: activeBot ? activeBot.positions : [],
        last_update: activeBot ? activeBot.lastUpdate : dbBot.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      data: bots,
      count: bots.length
    });

  } catch (error) {
    console.error('GET /api/bots error:', error);
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
    const {
      name,
      description,
      strategy_type,
      symbol,
      broker_id,
      broker_credentials,
      config,
      risk_config
    } = body;

    // Validate bot configuration
    const validationResult = validateBotConfig({
      name,
      strategy_type,
      symbol,
      broker_id,
      config,
      risk_config
    });

    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid bot configuration',
        details: validationResult.errors
      }, { status: 400 });
    }

    // Create bot in database
    const { data: bot, error: dbError } = await supabaseAdmin
      .from('trading_bots')
      .insert({
        user_id: userId,
        name,
        description,
        strategy_type,
        symbol,
        broker_id,
        broker_credentials: JSON.stringify(broker_credentials),
        config: JSON.stringify(config),
        risk_config: JSON.stringify(risk_config),
        status: 'stopped'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating bot in database:', dbError);
      return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
    }

    // Initialize bot in trading engine
    try {
      const botConfig = {
        id: bot.id,
        userId,
        name,
        strategy: strategy_type,
        symbol,
        brokerId: broker_id,
        brokerCredentials: broker_credentials,
        config,
        riskConfig: risk_config
      };

      await tradingEngine.initializeBot(botConfig);

      // Send notification
      await notificationService.sendSystemAlert(userId, {
        type: 'Bot Created',
        message: `Trading bot "${name}" has been created successfully`,
        severity: 'low'
      });
    }

    // Initialize bot performance record
    try {
      await supabaseAdmin
        .from('bot_performance')
        .insert({
          bot_id: bot.id,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0,
          total_profit: 0,
          total_loss: 0,
          win_rate: 0,
          profit_factor: 0,
          max_drawdown: 0,
          sharpe_ratio: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Could not create bot performance record:', error.message);
    }

      return NextResponse.json({
        success: true,
        data: bot,
        message: 'Bot created successfully'
      });

    } catch (engineError) {
      console.error('Error initializing bot in trading engine:', engineError);
      
      // Clean up database entry if engine initialization fails
      await supabaseAdmin
        .from('trading_bots')
        .delete()
        .eq('id', bot.id);

      return NextResponse.json({
        error: 'Failed to initialize trading bot',
        details: engineError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('POST /api/bots error:', error);
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
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Verify bot ownership
    const { data: existingBot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingBot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Handle bot actions
    if (action) {
      try {
        switch (action) {
          case 'start':
            await tradingEngine.startBot(id);
            await supabaseAdmin
              .from('trading_bots')
              .update({ status: 'running', updated_at: new Date().toISOString() })
              .eq('id', id);
            
            await notificationService.sendSystemAlert(userId, {
              type: 'Bot Started',
              message: `Trading bot "${existingBot.name}" has been started`,
              severity: 'low'
            });
            break;

          case 'stop':
            await tradingEngine.stopBot(id);
            await supabaseAdmin
              .from('trading_bots')
              .update({ status: 'stopped', updated_at: new Date().toISOString() })
              .eq('id', id);
            
            await notificationService.sendSystemAlert(userId, {
              type: 'Bot Stopped',
              message: `Trading bot "${existingBot.name}" has been stopped`,
              severity: 'low'
            });
            break;

          case 'pause':
            await tradingEngine.stopBot(id);
            await supabaseAdmin
              .from('trading_bots')
              .update({ status: 'paused', updated_at: new Date().toISOString() })
              .eq('id', id);
            break;

          default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          message: `Bot ${action}ed successfully`
        });

      } catch (error) {
        console.error(`Error ${action}ing bot:`, error);
        return NextResponse.json({
          error: `Failed to ${action} bot`,
          details: error.message
        }, { status: 500 });
      }
    }

    // Handle bot updates
    if (Object.keys(updates).length > 0) {
      const updateData = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.config) updateData.config = JSON.stringify(updates.config);
      if (updates.risk_config) updateData.risk_config = JSON.stringify(updates.risk_config);
      
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('trading_bots')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating bot:', updateError);
        return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Bot updated successfully'
      });
    }

    return NextResponse.json({ error: 'No action or updates provided' }, { status: 400 });

  } catch (error) {
    console.error('PUT /api/bots error:', error);
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Verify bot ownership
    const { data: bot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Clean up bot from trading engine
    try {
      await tradingEngine.cleanupBot(id);
    } catch (error) {
      console.error('Error cleaning up bot from trading engine:', error);
    }

    // Delete bot from database
    const { error: deleteError } = await supabaseAdmin
      .from('trading_bots')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting bot from database:', deleteError);
      return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
    }

    // Send notification
    await notificationService.sendSystemAlert(userId, {
      type: 'Bot Deleted',
      message: `Trading bot "${bot.name}" has been deleted`,
      severity: 'medium'
    });

    return NextResponse.json({
      success: true,
      message: 'Bot deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /api/bots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}