// ガチャ関連のルート
import Gacha from '../models/Gacha.js';
import { gachaDrawSchema } from '../schemas/validation.js';

export default async function gachaRoutes(fastify, options) {
  // ガチャ一覧取得
  fastify.get('/', async (request, reply) => {
    try {
      const gachas = await Gacha.findActive();
      return reply.send({ gachas: gachas.map(gacha => gacha.toJSON()) });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ詳細取得
  fastify.get('/:id', async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const gacha = await Gacha.findByIdWithItems(gachaId);

      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      return reply.send({ gacha: gacha.toJSON() });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ実行
  fastify.post('/:id/draw', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const { error, value } = gachaDrawSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.details[0].message 
        });
      }

      const { count } = value;

      const result = await Gacha.draw(gachaId, count);

      return reply.send({
        message: 'Gacha draw successful',
        ...result
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message === 'Gacha not found') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      if (error.message === 'Gacha is not active') {
        return reply.code(400).send({ error: 'Gacha is not active' });
      }
      if (error.message === 'No items available in this gacha') {
        return reply.code(400).send({ error: 'No items available in this gacha' });
      }
      
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
