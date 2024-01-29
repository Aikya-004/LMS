const request = require('supertest')
const db = require('../models/index')
const app = require('../app')
let server, agent
describe('Lms Test suite', () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true })
    server = app.listen(3000, () => {})
    agent = request.agent(server)
  })
  afterAll(async () => {
    await db.sequelize.close()
    server.close()
  })
  test('Create a new course', async () => {
    const response = await agent.post('/courses').send({
      courseName: 'New Course',
      courseDescription: 'Description for the new course.'
    })
    expect(response.statusCode).toBe(200)
    expect(response.header['content-type']).toBe(
      'application/json; charset=utf-8'
    )
    const parsedResponse = JSON.parse(response.text)
    expect(parsedResponse.id).toBeDefined()
    // const createCourseRes = await agent.post('/courses').send(newCourse)
    // expect(createCourseRes.statusCode).toBe(302)
  })
  test('should allow educator to create chapter', async () => {
    const response = await request(app).post('/chapter').send({
      chapterName: 'Test Chapter',
      chapterDescription: 'Description for new chapter'
    })

    expect(response.statusCode).toBe(200)
  })
  test('should allow educator to create Page', async () => {
    const response = await request(app).post('/page').send({
      title: 'Test Page',
      content: 'Content of the page'
    })

    expect(response.statusCode).toBe(200)
  })
})
