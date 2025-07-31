import axios from 'axios';
import { io } from 'socket.io-client';

class BrokerIntegration {
  constructor() {
    this.connections = new Map();
    this.accounts = new Map();
    this.brokers = {
      oanda: {
        name: 'OANDA',
        baseUrl: 'https://api-fxtrade.oanda.com',
        streamUrl: 'https://stream-fxtrade.oanda.com',
        demoUrl: 'https://api-fxpractice.oanda.com',
        demoStreamUrl: 'https://stream-fxpractice.oanda.com'
      },
      fxcm: {
        name: 'FXCM',
        baseUrl: 'https://api-demo.fxcm.com',
        streamUrl: 'wss://api-demo.fxcm.com/stream',
        liveUrl: 'https://api.fxcm.com',
        liveStreamUrl: 'wss://api.fxcm.com/stream'
      },
      ig: {
        name: 'IG Markets',
        baseUrl: 'https://demo-api.ig.com/gateway/deal',
        liveUrl: 'https://api.ig.com/gateway/deal'
      }
    };
  }

  async connectToBroker(brokerId, credentials, isDemo = true) {
    try {
      const broker = this.brokers[brokerId];
      if (!broker) {
        throw new Error(`Unsupported broker: ${brokerId}`);
      }

      const connection = {
        brokerId,
        isDemo,
        baseUrl: isDemo ? broker.demoUrl || broker.baseUrl : broker.liveUrl || broker.baseUrl,
        streamUrl: isDemo ? broker.demoStreamUrl || broker.streamUrl : broker.liveStreamUrl || broker.streamUrl,
        credentials,
        connected: false,
        account: null,
        positions: new Map(),
        orders: new Map()
      };

      // Authenticate with broker
      await this.authenticate(connection);
      
      // Get account information
      await this.getAccountInfo(connection);
      
      // Connect to real-time stream
      await this.connectToStream(connection);
      
      this.connections.set(brokerId, connection);
      return connection;

    } catch (error) {
      console.error(`Failed to connect to ${brokerId}:`, error);
      throw error;
    }
  }

  async authenticate(connection) {
    const { brokerId, baseUrl, credentials } = connection;
    
    switch (brokerId) {
      case 'oanda':
        await this.authenticateOanda(connection);
        break;
      case 'fxcm':
        await this.authenticateFXCM(connection);
        break;
      case 'ig':
        await this.authenticateIG(connection);
        break;
      default:
        throw new Error(`Authentication not implemented for ${brokerId}`);
    }
  }

  async authenticateOanda(connection) {
    const { baseUrl, credentials } = connection;
    
    const response = await axios.get(`${baseUrl}/v3/accounts`, {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error('OANDA authentication failed');
    }

    connection.account = response.data.accounts[0];
    connection.connected = true;
  }

  async authenticateFXCM(connection) {
    const { baseUrl, credentials } = connection;
    
    const response = await axios.post(`${baseUrl}/v1/authenticate`, {
      username: credentials.username,
      password: credentials.password
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error('FXCM authentication failed');
    }

    connection.token = response.data.token;
    connection.connected = true;
  }

  async authenticateIG(connection) {
    const { baseUrl, credentials } = connection;
    
    // IG requires a two-step authentication process
    const sessionResponse = await axios.post(`${baseUrl}/session`, {
      identifier: credentials.username,
      password: credentials.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-IG-API-KEY': credentials.apiKey,
        'Version': '3'
      },
      timeout: 10000
    });

    if (sessionResponse.status !== 200) {
      throw new Error('IG authentication failed');
    }

    connection.session = sessionResponse.data;
    connection.connected = true;
  }

  async getAccountInfo(connection) {
    const { brokerId, baseUrl } = connection;
    
    switch (brokerId) {
      case 'oanda':
        await this.getOandaAccountInfo(connection);
        break;
      case 'fxcm':
        await this.getFXCMAccountInfo(connection);
        break;
      case 'ig':
        await this.getIGAccountInfo(connection);
        break;
    }
  }

  async getOandaAccountInfo(connection) {
    const { baseUrl, account } = connection;
    
    const response = await axios.get(`${baseUrl}/v3/accounts/${account.id}`, {
      headers: {
        'Authorization': `Bearer ${connection.credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    connection.accountInfo = response.data;
  }

  async getFXCMAccountInfo(connection) {
    const { baseUrl, token } = connection;
    
    const response = await axios.get(`${baseUrl}/v1/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    connection.accountInfo = response.data;
  }

  async getIGAccountInfo(connection) {
    const { baseUrl, session } = connection;
    
    const response = await axios.get(`${baseUrl}/accounts`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'X-IG-API-KEY': connection.credentials.apiKey,
        'Version': '3'
      }
    });

    connection.accountInfo = response.data;
  }

  async connectToStream(connection) {
    const { brokerId, streamUrl } = connection;
    
    switch (brokerId) {
      case 'oanda':
        await this.connectOandaStream(connection);
        break;
      case 'fxcm':
        await this.connectFXCMStream(connection);
        break;
      case 'ig':
        await this.connectIGStream(connection);
        break;
    }
  }

  async connectOandaStream(connection) {
    const { streamUrl, account, credentials } = connection;
    
    const socket = io(streamUrl, {
      auth: {
        token: credentials.apiKey
      }
    });

    socket.on('connect', () => {
      console.log('Connected to OANDA stream');
      socket.emit('subscribe', {
        accountID: account.id,
        instruments: ['EUR_USD', 'GBP_USD', 'USD_JPY']
      });
    });

    socket.on('pricing', (data) => {
      this.handlePriceUpdate(connection, data);
    });

    socket.on('transaction', (data) => {
      this.handleTransactionUpdate(connection, data);
    });

    connection.stream = socket;
  }

  async connectFXCMStream(connection) {
    const { streamUrl, token } = connection;
    
    const socket = io(streamUrl, {
      auth: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('Connected to FXCM stream');
      socket.emit('subscribe', {
        symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY']
      });
    });

    socket.on('price', (data) => {
      this.handlePriceUpdate(connection, data);
    });

    socket.on('trade', (data) => {
      this.handleTransactionUpdate(connection, data);
    });

    connection.stream = socket;
  }

  async connectIGStream(connection) {
    // IG uses a different streaming protocol
    // Implementation would depend on IG's specific streaming API
    console.log('IG streaming not implemented yet');
  }

  handlePriceUpdate(connection, data) {
    // Update real-time prices
    const symbol = data.instrument || data.symbol;
    connection.positions.forEach((position, positionId) => {
      if (position.symbol === symbol) {
        position.currentPrice = data.price;
        position.unrealizedPnL = this.calculateUnrealizedPnL(position, data.price);
      }
    });
  }

  handleTransactionUpdate(connection, data) {
    // Update positions and orders based on transaction data
    if (data.type === 'ORDER_FILL') {
      this.updatePosition(connection, data);
    } else if (data.type === 'ORDER_CANCEL') {
      this.cancelOrder(connection, data);
    }
  }

  async placeOrder(connection, orderParams) {
    const { brokerId, baseUrl } = connection;
    
    try {
      switch (brokerId) {
        case 'oanda':
          return await this.placeOandaOrder(connection, orderParams);
        case 'fxcm':
          return await this.placeFXCMOrder(connection, orderParams);
        case 'ig':
          return await this.placeIGOrder(connection, orderParams);
        default:
          throw new Error(`Order placement not implemented for ${brokerId}`);
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  async placeOandaOrder(connection, orderParams) {
    const { baseUrl, account, credentials } = connection;
    const { symbol, side, units, type = 'MARKET', price, stopLoss, takeProfit } = orderParams;
    
    const orderData = {
      order: {
        type: type,
        instrument: symbol,
        units: side === 'BUY' ? units : -units,
        timeInForce: 'FOK',
        positionFill: 'DEFAULT'
      }
    };

    if (type === 'LIMIT' && price) {
      orderData.order.price = price;
    }

    if (stopLoss) {
      orderData.order.stopLossOnFill = {
        price: stopLoss
      };
    }

    if (takeProfit) {
      orderData.order.takeProfitOnFill = {
        price: takeProfit
      };
    }

    const response = await axios.post(
      `${baseUrl}/v3/accounts/${account.id}/orders`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  async placeFXCMOrder(connection, orderParams) {
    const { baseUrl, token } = connection;
    const { symbol, side, units, type = 'MARKET', price, stopLoss, takeProfit } = orderParams;
    
    const orderData = {
      symbol: symbol,
      side: side,
      qty: units,
      type: type,
      timeInForce: 'IOC'
    };

    if (type === 'LIMIT' && price) {
      orderData.price = price;
    }

    if (stopLoss) {
      orderData.stopLoss = stopLoss;
    }

    if (takeProfit) {
      orderData.takeProfit = takeProfit;
    }

    const response = await axios.post(
      `${baseUrl}/v1/orders`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  async placeIGOrder(connection, orderParams) {
    const { baseUrl, session, credentials } = connection;
    const { symbol, side, units, type = 'MARKET', price, stopLoss, takeProfit } = orderParams;
    
    const orderData = {
      epic: symbol,
      direction: side,
      size: units,
      orderType: type,
      timeInForce: 'FILL_OR_KILL'
    };

    if (type === 'LIMIT' && price) {
      orderData.level = price;
    }

    if (stopLoss) {
      orderData.stopLevel = stopLoss;
    }

    if (takeProfit) {
      orderData.profitLevel = takeProfit;
    }

    const response = await axios.post(
      `${baseUrl}/positions/otc`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-IG-API-KEY': credentials.apiKey,
          'Version': '3'
        }
      }
    );

    return response.data;
  }

  async getPositions(connection) {
    const { brokerId, baseUrl } = connection;
    
    try {
      switch (brokerId) {
        case 'oanda':
          return await this.getOandaPositions(connection);
        case 'fxcm':
          return await this.getFXCMPositions(connection);
        case 'ig':
          return await this.getIGPositions(connection);
        default:
          throw new Error(`Position retrieval not implemented for ${brokerId}`);
      }
    } catch (error) {
      console.error('Failed to get positions:', error);
      throw error;
    }
  }

  async getOandaPositions(connection) {
    const { baseUrl, account, credentials } = connection;
    
    const response = await axios.get(
      `${baseUrl}/v3/accounts/${account.id}/positions`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.positions;
  }

  async getFXCMPositions(connection) {
    const { baseUrl, token } = connection;
    
    const response = await axios.get(
      `${baseUrl}/v1/positions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.positions;
  }

  async getIGPositions(connection) {
    const { baseUrl, session, credentials } = connection;
    
    const response = await axios.get(
      `${baseUrl}/positions`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-IG-API-KEY': credentials.apiKey,
          'Version': '3'
        }
      }
    );

    return response.data.positions;
  }

  calculateUnrealizedPnL(position, currentPrice) {
    const { side, units, averagePrice } = position;
    
    if (side === 'BUY') {
      return (currentPrice - averagePrice) * units;
    } else {
      return (averagePrice - currentPrice) * units;
    }
  }

  updatePosition(connection, transactionData) {
    // Update position based on transaction data
    const positionId = transactionData.positionId;
    const position = connection.positions.get(positionId);
    
    if (position) {
      Object.assign(position, transactionData);
      connection.positions.set(positionId, position);
    }
  }

  cancelOrder(connection, transactionData) {
    // Remove cancelled order
    const orderId = transactionData.orderId;
    connection.orders.delete(orderId);
  }

  disconnect(brokerId) {
    const connection = this.connections.get(brokerId);
    if (connection) {
      if (connection.stream) {
        connection.stream.disconnect();
      }
      this.connections.delete(brokerId);
    }
  }

  disconnectAll() {
    for (const [brokerId, connection] of this.connections) {
      this.disconnect(brokerId);
    }
  }
}

export const brokerIntegration = new BrokerIntegration();