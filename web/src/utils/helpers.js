// ユーティリティ関数

// エラーハンドラー
export const errorHandler = (fastify) => {
  return (error, request, reply) => {
    fastify.log.error(error);
    
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: error.validation
      });
    }

    return reply.code(500).send({
      error: 'Internal server error'
    });
  };
};

// Graceful shutdown
export const setupGracefulShutdown = (fastify, database) => {
  const gracefulShutdown = async () => {
    try {
      await database.close();
      await fastify.close();
      fastify.log.info('Server shutdown successfully');
      process.exit(0);
    } catch (error) {
      fastify.log.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};
