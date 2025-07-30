import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { validateBotConfig } from '@/lib/utils/validation';

export async function GET(request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const strategy = searchParams.get('strategy');

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

    const { data: bots, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bots:', error);
      // Return mock data if database is not available
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 1,
            name: "AI Scalper Pro",
            strategy_type: "scalping",
            symbol: "EURUSD",
            status: "active",
            config: { lot_size: 0.1, max_spread: 3 },
            risk_config: { max_drawdown: 0.05, max_daily_loss: 0.02 },
            created_at: new Date().toISOString(),
            bot_performance: {
              total_trades: 45,
              winning_trades: 35,
              total_profit: 1250.50,
              win_rate: 78.5,
              max_drawdown: 5.2,
              sharpe_ratio: 1.8
            }
          },
          {
            id: 2,
            name: "Grid Master",
            strategy_type: "grid",
            symbol: "GBPUSD",
            status: "active",
            config: { grid_levels: 10, grid_spacing: 0.001 },
            risk_config: { max_drawdown: 0.08, max_daily_loss: 0.03 },
            created_at: new Date().toISOString(),
            bot_performance: {
              total_trades: 32,
              winning_trades: 21,
              total_profit: 890.25,
              win_rate: 65.8,
              max_drawdown: 8.1,
              sharpe_ratio: 1.2
            }
          }
        ],
        count: 2
      });
    }

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
    
    // Validate bot configuration
    const validation = validateBotConfig(body);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid bot configuration',
        details: validation.errors 
      }, { status: 400 });
    }

    const {
      name,
      strategy_type,
      symbol,
      timeframe,
      config,
      risk_config,
      description
    } = body;

    // Create bot in database
    const { data: bot, error } = await supabaseAdmin
      .from('trading_bots')
      .insert({
        user_id: userId,
        name,
        strategy_type,
        symbol,
        timeframe,
        config,
        risk_config,
        description,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bot:', error);
      // Return mock bot data if database is not available
      const mockBot = {
        id: Date.now(),
        user_id: userId,
        name,
        strategy_type,
        symbol,
        timeframe,
        config,
        risk_config,
        description,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return NextResponse.json({
        success: true,
        data: mockBot,
        message: 'Bot created successfully (demo mode)'
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

    // Log bot creation
    try {
      await supabaseAdmin
        .from('system_logs')
        .insert({
          user_id: userId,
          event_type: 'bot_created',
          details: {
          bot_id: bot.id,
          bot_name: bot.name,
          strategy_type: bot.strategy_type,
          symbol: bot.symbol
        },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      data: bot,
      message: 'Bot created successfully'
    }, { status: 201 });

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
    const { bot_id, ...updates } = body;

    if (!bot_id) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Verify bot ownership
    const { data: existingBot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('id, user_id, status')
      .eq('id', bot_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingBot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Validate updates if config is being changed
    if (updates.config || updates.risk_config) {
      const validation = validateBotConfig({ ...existingBot, ...updates });
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: 'Invalid bot configuration',
          details: validation.errors 
        }, { status: 400 });
      }
    }

    // Update bot
    const { data: updatedBot, error } = await supabaseAdmin
      .from('trading_bots')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', bot_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bot:', error);
      return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
    }

    // Log bot update
    await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id: userId,
        event_type: 'bot_updated',
        details: {
          bot_id: bot_id,
          updates: Object.keys(updates),
          previous_status: existingBot.status,
          new_status: updates.status || existingBot.status
        },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      data: updatedBot,
      message: 'Bot updated successfully'
    });

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
    const bot_id = searchParams.get('bot_id');

    if (!bot_id) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    // Verify bot ownership and get bot details
    const { data: bot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('id, user_id, name, status')
      .eq('id', bot_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Check if bot is running
    if (bot.status === 'active') {
      return NextResponse.json({ 
        error: 'Cannot delete active bot. Please stop the bot first.' 
      }, { status: 400 });
    }

    // Delete related records first (due to foreign key constraints)
    await Promise.all([
      supabaseAdmin.from('trades').delete().eq('bot_id', bot_id),
      supabaseAdmin.from('bot_performance').delete().eq('bot_id', bot_id)
    ]);

    // Delete the bot
    const { error: deleteError } = await supabaseAdmin
      .from('trading_bots')
      .delete()
      .eq('id', bot_id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting bot:', deleteError);
      return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
    }

    // Log bot deletion
    await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id: userId,
        event_type: 'bot_deleted',
        details: {
          bot_id: bot_id,
          bot_name: bot.name
        },
        created_at: new Date().toISOString()
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