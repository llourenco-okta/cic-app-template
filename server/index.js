import * as dotenv from 'dotenv';
import express from 'express';
import {} from '@okta/jwt-verifier';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { existsSync } from 'fs';
import JwtVerifier from './jwtVerifier';

if (existsSync('.env.local')) {
	dotenv.config({ path: `.env.local` });
} else {
	dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
	VITE_AUTH_DOMAIN: domain,
	VITE_AUTH_CLIENT_ID: clientId,
	VITE_AUTH_AUDIENCE: AUDIENCE = [],
	VITE_AUTH_PERMISSIONS: PERMISSIONS = [],
} = process.env;

const permissions = Array.isArray(PERMISSIONS)
	? PERMISSIONS
	: PERMISSIONS.split(' ');

const audience = Array.isArray(AUDIENCE)
	? AUDIENCE
	: AUDIENCE.includes(', ')
	? AUDIENCE.split(', ')
	: AUDIENCE.split(',');

const jwksUri = `https://${domain}/.well-known/jwks.json`;

const issuer =
	domain.lastIndexOf('/') === domain.length - 1
		? 'https://' + domain
		: 'https://' + domain + '/';

const app = express();

app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(helmet());
app.use(express.static(join(__dirname, 'public')));

const verifyJwt = (options) => {
	options = {
		issuer,
		clientId,
		jwksUri,
		...options,
	};

	const verifier = new JwtVerifier(options);

	const verifyToken = async (req, res, next) => {
		try {
			if (
				req?.method === 'OPTIONS' &&
				req.get('access-control-request-headers')
			) {
				console.log('doing OPTIONS');
				const hasAuthInAccessControl = req
					.get('access-control-request-headers')
					?.split(',')
					?.map((header) => header?.trim()?.toLowerCase())
					?.includes('authorization');

				if (hasAuthInAccessControl) {
					return next();
				}
			}
			const authHeader = req.get('authorization');
			const match = authHeader?.match(/Bearer (.+)/) || [];

			if (match.length < 1) {
				return res
					.status(401)
					.send('Unable to parse `Authorization` header');
			}

			const accessToken = match[1];

			req.jwt = await verifier.verifyToken(accessToken, {
				audience,
			});

			next();
		} catch (error) {
			const response = {
				success: false,
				message: error?.message,
			};

			console.log({ ...response, stack: error?.stack });

			res.status(401).json(response);
		}
	};

	return verifyToken;
};

app.get('/api/public', (req, res) =>
	res.json({
		success: true,
		message:
			'This is the Public API. Anyone can request this response. Hooray!',
	})
);

app.get('/api/private', verifyJwt(), (req, res) =>
	res.json({
		success: true,
		message:
			'This is the private API. Only special folk, indicated by the `audience` configuration, can access it. Awesome!',
	})
);

app.get(
	'/api/scoped',
	verifyJwt({ assertClaims: { 'permissions.includes': permissions } }),
	(req, res) =>
		res.json({
			success: true,
			message:
				'This is the scoped API. Only a valid access token with both the correct audience AND valid permissions has access. You did it!',
		})
);

export const handler = app;