import { expect, test, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

test('create new user', async () => {
  await request(app.server)
    .post('/users')
    .send({
      firstName: 'Vitor',
      lastName: 'Bradaci',
      email: 'dasdasuh@hotmail.com',
    })
    .expect(201)
})
