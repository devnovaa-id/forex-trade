import { NextResponse } from 'next/server';
import OandaClient from '@/lib/oanda/client';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
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

    // Dapatkan informasi akun real dari OANDA
    const accountResult = await oandaClient.getAccountInfo();
    
    if (!accountResult.success) {
      return NextResponse.json(
        { error: accountResult.error.message },
        { status: 500 }
      );
    }

    const account = accountResult.data;

    // Format data untuk response
    const accountData = {
      id: account.id,
      currency: account.currency,
      balance: parseFloat(account.balance),
      equity: parseFloat(account.NAV), // Net Asset Value
      margin: parseFloat(account.marginUsed),
      freeMargin: parseFloat(account.marginAvailable),
      marginLevel: parseFloat(account.marginRate) * 100,
      openPositions: parseInt(account.openPositionCount),
      openOrders: parseInt(account.pendingOrderCount),
      pl: parseFloat(account.pl),
      unrealizedPL: parseFloat(account.unrealizedPL),
      marginCallLevel: parseFloat(account.marginCallPercent) * 100,
      stopoutLevel: parseFloat(account.marginCloseoutPercent) * 100,
      lastTransactionID: account.lastTransactionID,
      environment: isLive ? 'live' : 'practice'
    };

    return NextResponse.json({
      success: true,
      data: accountData
    });

  } catch (error) {
    console.error('Error fetching OANDA account:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data akun OANDA' },
      { status: 500 }
    );
  }
}