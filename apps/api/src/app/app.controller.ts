import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { cacheConfig } from './core/config/index.js';

@Controller('health')
export class AppController {
	constructor(
		private readonly dataSource: DataSource,
		@Inject(cacheConfig.KEY)
		private readonly cache: ConfigType<typeof cacheConfig>
	) {}

	@Get()
	async health() {
		await this.dataSource.query('SELECT 1');
		return { status: 'ok', database: this.dataSource.options.type, cache: this.cache.store };
	}
}
