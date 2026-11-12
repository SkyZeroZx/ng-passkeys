import { createServer } from '../dist/apps/api/src/serverless.js';

const server = createServer();

export default async function handler(req, res) {
	(await server)(req, res);
}
