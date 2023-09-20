import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdSession } from '../middlewares/check-session-id-exists'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (req: FastifyRequest, res: FastifyReply) => {
    const createUserBodySchema = z.object({
      firstName: z.string().nonempty('First name cannot be empty'),
      lastName: z.string().nonempty('Last name cannot be empty'),
      email: z.string().email('The email cannot be empty'),
    })

    const validationResult = createUserBodySchema.safeParse(req.body)

    if (!validationResult.success) {
      return res.status(400).send({
        message: validationResult.error.errors,
      })
    }

    const { firstName, lastName, email } = validationResult.data

    let sessionId = req.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()
      res.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    const user = await knex('users').insert(
      {
        id: randomUUID(),
        first_name: firstName,
        last_name: lastName,
        email,
        session_id: sessionId,
      },
      '*',
    )

    res.send({ user })
  })

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdSession],
    },
    async (req: FastifyRequest, res: FastifyReply) => {
      const { sessionId } = req.cookies

      const { id } = await knex('users')
        .select('id')
        .where({ session_id: sessionId })
        .first()

      const meals = await knex('meals')
        .select('on_diet')
        .where({ user_id: id })
        .orderBy('updated_at')

      let bestSequence = 0
      let currentSequence = 0

      for (const meal of meals) {
        if (meal.on_diet === 1) {
          currentSequence++
          bestSequence = Math.max(bestSequence, currentSequence)
        } else {
          currentSequence = 0
        }
      }

      const onDiet = meals.filter((meal) => meal.on_diet).length

      res.send({
        total: meals.length,
        onDiet,
        offDiet: meals.length - onDiet,
        bestSequence,
      })
    },
  )
}
