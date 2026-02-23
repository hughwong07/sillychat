import { EventEmitter } from 'events';
import { DiscoveryConfig, ServiceInfo } from './types.js';
import { Logger } from '@utils/logger.js';

export interface DiscoveryServiceOptions {
  config: DiscoveryConfig;
  port: number;
  logger: Logger;
}

export class DiscoveryService extends EventEmitter {
  private config: DiscoveryConfig;
  private port: number;
  private logger: Logger;
  private isRunning = false;
  private mdns: any = null;
  private bonjour: any = null;
  private service: any = null;
  private browser: any = null;
  private discoveredServices: Map<string, ServiceInfo> = new Map();

  constructor(options: DiscoveryServiceOptions) {
    super();
    this.config = options.config;
    this.port = options.port;
    this.logger = options.logger.createChild('DiscoveryService');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Discovery service already running');
      return;
    }

    this.logger.info('Starting discovery service...');

    try {
      if (this.config.method === 'mdns') {
        await this.startMdns();
      } else if (this.config.method === 'bonjour') {
        await this.startBonjour();
      }

      this.isRunning = true;
      this.emit('started');
      this.logger.info('Discovery service started');
    } catch (error) {
      this.logger.error('Failed to start discovery service', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping discovery service...');

    if (this.service) {
      try {
        this.service.stop();
      } catch (error) {
        this.logger.error('Error stopping service', { error });
      }
      this.service = null;
    }

    if (this.browser) {
      try {
        this.browser.stop();
      } catch (error) {
        this.logger.error('Error stopping browser', { error });
      }
      this.browser = null;
    }

    this.mdns = null;
    this.bonjour = null;
    this.isRunning = false;
    this.discoveredServices.clear();

    this.emit('stopped');
    this.logger.info('Discovery service stopped');
  }

  getDiscoveredServices(): ServiceInfo[] {
    return Array.from(this.discoveredServices.values());
  }

  private async startMdns(): Promise<void> {
    try {
      // Dynamic import to avoid issues when module is not available
      const { default: mdns } = await import('mdns');
      this.mdns = mdns;

      // Create service type
      const serviceType = this.mdns.makeServiceType({
        name: this.config.serviceName,
        protocol: 'tcp',
      });

      // Advertise service
      this.service = this.mdns.createAdvertisement(serviceType, this.port, {
        name: this.config.instanceName || `xsg-${Math.random().toString(36).substring(2, 8)}`,
        txtRecord: {
          version: '1.0.0',
          path: '/ws',
        },
      });

      this.service.start();

      // Browse for other services
      this.browser = this.mdns.createBrowser(serviceType);

      this.browser.on('serviceUp', (service: any) => {
        const info: ServiceInfo = {
          name: service.name,
          type: service.type.name,
          host: service.host,
          port: service.port,
          addresses: service.addresses,
          txt: service.txtRecord,
          lastSeen: Date.now(),
        };

        this.discoveredServices.set(service.name, info);
        this.emit('serviceUp', info);
        this.logger.info(`Service discovered: ${service.name} at ${service.host}:${service.port}`);
      });

      this.browser.on('serviceDown', (service: any) => {
        this.discoveredServices.delete(service.name);
        this.emit('serviceDown', { name: service.name });
        this.logger.info(`Service removed: ${service.name}`);
      });

      this.browser.start();
    } catch (error) {
      this.logger.warn('mdns module not available, falling back to bonjour');
      await this.startBonjour();
    }
  }

  private async startBonjour(): Promise<void> {
    try {
      const { default: bonjour } = await import('bonjour-service');
      this.bonjour = new bonjour();

      // Publish service
      this.service = this.bonjour.publish({
        name: this.config.instanceName || `xsg-${Math.random().toString(36).substring(2, 8)}`,
        type: this.config.serviceName,
        port: this.port,
        txt: {
          version: '1.0.0',
          path: '/ws',
        },
      });

      // Browse for services
      this.browser = this.bonjour.find({ type: this.config.serviceName });

      this.browser.on('up', (service: any) => {
        const info: ServiceInfo = {
          name: service.name,
          type: service.type,
          host: service.host,
          port: service.port,
          addresses: service.addresses,
          txt: service.txt,
          lastSeen: Date.now(),
        };

        this.discoveredServices.set(service.name, info);
        this.emit('serviceUp', info);
        this.logger.info(`Service discovered: ${service.name} at ${service.host}:${service.port}`);
      });

      this.browser.on('down', (service: any) => {
        this.discoveredServices.delete(service.name);
        this.emit('serviceDown', { name: service.name });
        this.logger.info(`Service removed: ${service.name}`);
      });
    } catch (error) {
      this.logger.error('bonjour-service module not available', { error });
      throw error;
    }
  }
}
