const request = require('supertest')
const db = require('../models/index')
const app = require('../app')
var cheerio = require('cheerio')
let server, agent
function extractCsrfToken (res) {
  const $ = cheerio.load(res.text)
  return $('[name=_csrf]').val()
}
describe('Lms Test suite', () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true })
    server = app.listen(4000, () => {})
    agent = request.agent(server)
  })
  afterAll(async () => {
    await db.sequelize.close()
    server.close()
  })
  test('Create a new course', async () => {
    let csrfToken = extractCsrfToken(await agent.get('/courses'))

    const createCourseRes = await agent.post('/courses').send({
      courseName: 'New Course',
      courseDescription: 'Description for the new course.',
      _csrf: csrfToken
    })

    // Extract the relevant data from the response to send in the next request
    const { body: createdCourse } = createCourseRes

    const createCoursesRes = await agent.post('/courses').send({
      // Send only the necessary data, not the entire response object
      courseName: createdCourse.courseName,
      courseDescription: createdCourse.courseDescription,
      _csrf: csrfToken
    })

    expect(createCoursesRes.statusCode).toBe(302)
  })

  // test('should allow educator to create chapter', async () => {
  //   const response = await request(app).post('/chapter').send({
  //     chapterName: 'Test Chapter',
  //     chapterDescription: 'Description for new chapter'
  //   })

  //   expect(response.statusCode).toBe(404)
  // })
  // test('should allow educator to create Page', async () => {
  //   const response = await request(app).post('/page').send({
  //     title: 'Test Page',
  //     content: 'Content of the page'
  //   })

  //   expect(response.statusCode).toBe(404)
  // })
})
