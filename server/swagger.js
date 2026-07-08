import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kyy Assistant API',
            version: '1.0.0',
            description: 'REST API untuk Kyy Assistant — personal finance & productivity bot',
        },
        servers: [
            { url: 'http://localhost:3001', description: 'Development' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js', './auth.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
