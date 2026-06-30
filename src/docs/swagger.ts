import swaggerJSDoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SRI DURGA MATA TEMPLE API',
      version: '1.0.0',
      description: `
## శ్రీ శ్రీ శ్రీ దుర్గామాత నల్లపోచమ్మ దేవాలయం, బాపూనగర్.

This is the production-grade administration backend API for Sri Durga Mata Temple.
Features include role-based security, donor ledgers, financial transparency, asset inventory, event RSVPs, and audit logs.

### Authentication
Most endpoints require a JWT bearer access token. Log in at \`/auth/login\` to get a token, and include it in requests in the format:
\`Authorization: Bearer <token>\`
      `,
    },
    servers: [
      {
        url: '/api',
        description: 'V1 API Server Prefix',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token below.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['Super Admin', 'Treasurer', 'Accountant', 'Committee Member', 'Content Manager'] },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
          },
        },
        CommitteeMember: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            designation: { type: 'string' },
            tenureStart: { type: 'string' },
            tenureEnd: { type: 'string' },
            biography: { type: 'string' },
            image: { type: 'string' },
            contactDetails: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                phone: { type: 'string' },
              },
            },
            status: { type: 'string', enum: ['Active', 'Inactive'] },
          },
        },
        Donation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            donorName: { type: 'string' },
            mobile: { type: 'string' },
            email: { type: 'string' },
            donationType: { type: 'string' },
            amount: { type: 'number' },
            itemDescription: { type: 'string' },
            paymentMethod: { type: 'string' },
            receiptNumber: { type: 'string' },
            transactionReference: { type: 'string' },
            isPublic: { type: 'boolean' },
            status: { type: 'string', enum: ['Pending', 'Verified', 'Cancelled'] },
            date: { type: 'string', format: 'date-time' },
          },
        },
        FinancialTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['Income', 'Expense'] },
            category: { type: 'string' },
            amount: { type: 'number' },
            description: { type: 'string' },
            reference: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            approvedBy: { type: 'string' },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            assetName: { type: 'string' },
            category: { type: 'string' },
            acquisitionDate: { type: 'string', format: 'date-time' },
            purchaseValue: { type: 'number' },
            currentValue: { type: 'number' },
            location: { type: 'string' },
            image: { type: 'string' },
            notes: { type: 'string' },
            status: { type: 'string', enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Disposed'] },
            valuationHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date-time' },
                  value: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            banner: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            registrationEnabled: { type: 'boolean' },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  activity: { type: 'string' },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Operation failed.' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          summary: 'User Login',
          description: 'Authenticate user and retrieve access & refresh tokens. Implements account lockout (5 failed attempts).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', example: 'admin@sridurgamatatemple.org' },
                    password: { type: 'string', example: 'DurgaMataAdmin2026!' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Successful authentication',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            401: { description: 'Invalid email or password' },
            403: { description: 'Account locked or inactive' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          summary: 'Refresh Access Token',
          description: 'Uses refresh token rotation to generate new access and refresh tokens.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'New tokens rotated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            403: { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Profile data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            401: { description: 'Missing access token' },
          },
        },
      },
      '/committee': {
        get: {
          summary: 'Get list of committee members',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'e.g. Current Committee or Past Member' },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'List of members',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      members: { type: 'array', items: { $ref: '#/components/schemas/CommitteeMember' } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create committee member',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CommitteeMember' },
              },
            },
          },
          responses: {
            201: { description: 'Member created' },
            403: { description: 'Forbidden. Admin access required.' },
          },
        },
      },
      '/donations': {
        get: {
          summary: 'Search donations log',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search name, receipt number, or mobile' },
            { name: 'type', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: {
              description: 'Donations search result list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      donations: { type: 'array', items: { $ref: '#/components/schemas/Donation' } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Log a new donation',
          description: 'Log monetary, gold, silver, or asset donation. Generates unique receipt number.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    donorName: { type: 'string', example: 'Rahul Sharma Family' },
                    mobile: { type: 'string', example: '9848012345' },
                    donationType: { type: 'string', example: 'Monetary' },
                    amount: { type: 'number', example: 51000 },
                    paymentMethod: { type: 'string', example: 'UPI' },
                    purpose: { type: 'string', example: 'Navratri Seva Sponsorship' },
                  },
                  required: ['donorName', 'donationType', 'paymentMethod'],
                },
              },
            },
          },
          responses: {
            201: { description: 'Donation logged successfully' },
          },
        },
      },
      '/donations/{id}/receipt': {
        get: {
          summary: 'Download Receipt PDF',
          description: 'Generates and streams an elegant donation receipt PDF file.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'PDF Receipt file stream' },
            404: { description: 'Donation record not found' },
          },
        },
      },
      '/financials': {
        get: {
          summary: 'Get ledger transactions',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['Income', 'Expense'] } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: {
              description: 'Ledger log results',
            },
          },
        },
        post: {
          summary: 'Log transaction entry',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['Income', 'Expense'] },
                    category: { type: 'string', example: 'Hundi Collection' },
                    amount: { type: 'number', example: 250000 },
                    description: { type: 'string', example: 'Weekly hundi counting' },
                    reference: { type: 'string', example: 'HUNDI-W40' },
                  },
                  required: ['type', 'category', 'amount'],
                },
              },
            },
          },
          responses: {
            201: { description: 'Transaction added' },
          },
        },
      },
      '/assets': {
        get: {
          summary: 'Get assets list',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Assets list' },
          },
        },
        post: {
          summary: 'Register new asset',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' },
              },
            },
          },
          responses: {
            201: { description: 'Asset registered' },
          },
        },
      },
      '/assets/{id}/revalue': {
        post: {
          summary: 'Revalue asset (Update history)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    value: { type: 'number', example: 20000000 },
                    notes: { type: 'string', example: 'Annual gold revaluation' },
                  },
                  required: ['value', 'notes'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Asset value updated and logged in history' },
          },
        },
      },
    },
  },
  apis: [], // Defined statically above
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  // Custom dark-themed CSS overrides for Swagger UI to make it feel premium
  const customCss = `
    .swagger-ui { background-color: #121212; color: #e0e0e0; }
    .swagger-ui .info .title { color: #CFB53B; }
    .swagger-ui .info p, .swagger-ui .info li { color: #b0b0b0; }
    .swagger-ui .scheme-container { background-color: #1e1e1e; box-shadow: none; border-bottom: 1px solid #333; }
    .swagger-ui select { background-color: #333; color: white; border: 1px solid #444; }
    .swagger-ui .opblock.opblock-post { background: rgba(73, 204, 144, 0.1); border-color: #49cc90; }
    .swagger-ui .opblock.opblock-get { background: rgba(97, 175, 254, 0.1); border-color: #61affe; }
    .swagger-ui .opblock.opblock-put { background: rgba(252, 161, 48, 0.1); border-color: #fca130; }
    .swagger-ui .opblock.opblock-delete { background: rgba(249, 62, 62, 0.1); border-color: #f93e3e; }
    .swagger-ui .opblock .opblock-summary-operation-id, .swagger-ui .opblock .opblock-summary-path, .swagger-ui .opblock .opblock-summary-path__deprecated { color: #e0e0e0; }
    .swagger-ui .opblock .opblock-summary-description { color: #b0b0b0; }
    .swagger-ui .tabli button { color: #e0e0e0; }
    .swagger-ui .btn.authorize { color: #CFB53B; border-color: #CFB53B; background: transparent; }
    .swagger-ui .btn.authorize svg { fill: #CFB53B; }
    .swagger-ui .dialog-ux .modal-ux { background-color: #1e1e1e; border: 1px solid #333; }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #CFB53B; }
    .swagger-ui .dialog-ux .modal-ux-content { color: #e0e0e0; }
    .swagger-ui .model { color: #e0e0e0; }
    .swagger-ui .model-box { background: #1e1e1e; }
    .swagger-ui .prop-type { color: #fca130; }
  `;

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss,
      customSiteTitle: 'Sri Durga Mata Temple API Documentation',
    })
  );
}
export default setupSwagger;
