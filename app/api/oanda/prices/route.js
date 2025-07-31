import { NextResponse } from 'next/server';
import OandaClient from '@/lib/oanda/client';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const instruments = searchParams.get('instruments') || 'EUR_USD';
    const apiKey = request.headers.get('x-oanda-api-key');
    const accountId = request.headers.get('x-oanda-account-id');
    const environment = request.headers.get('x-oanda-environment') || 'practice';

    if (!apiKey || !accountId) {
      return NextResponse.json(
        { error: 'API Key dan Account ID OANDA diperlukan' },
        { status: 400 }
      );
    }

    const isLive = environment === 'live';
    const oandaClient = new OandaClient(apiKey, accountId, isLive);

    // Dapatkan harga real-time dari OANDA
    const pricesResult = await oandaClient.getCurrentPrices(instruments);
    
    if (!pricesResult.success) {
      return NextResponse.json(
        { error: pricesResult.error.message },
        { status: 500 }
      );
    }

    const prices = pricesResult.data.map(price => ({
      instrument: price.instrument,
      bid: parseFloat(price.bids[0]?.price || 0),
      ask: parseFloat(price.asks[0]?.price || 0),
      spread: parseFloat(price.asks[0]?.price || 0) - parseFloat(price.bids[0]?.price || 0),
      spreadPips: ((parseFloat(price.asks[0]?.price || 0) - parseFloat(price.bids[0]?.price || 0)) * 10000).toFixed(1),
      time: price.time,
      tradeable: price.tradeable,
      status: price.status,
      liquidity: {
        bid: parseFloat(price.bids[0]?.liquidity || 0),
        ask: parseFloat(price.asks[0]?.liquidity || 0)
      }
    }));

    return NextResponse.json({
      success: true,
      data: prices,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching OANDA prices:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil harga dari OANDA' },
      { status: 500 }
    );
  }
}