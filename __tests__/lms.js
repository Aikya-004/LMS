/* eslint-disable no-undef */
const request = require('supertest')
const db = require('../models/index')
const app = require('../app')
var cheerio = require('cheerio')
let server, agent
function extractCsrfToken (res) {
  const $ = cheerio.load(res.text)
  return $('[name=_csrf]').val()
}
const login = async (agent, username, password) => {
  let res = await agent.get('/login')
  let csrfToken = extractCsrfToken(res)
  res = await agent.post('/session').send({
    email: username,
    password,
    _csrf: csrfToken
  })
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
  let courseId
  test('Sign up', async () => {
    let res = await agent.get('/signup')
    const csrfToken = extractCsrfToken(res)
    res = await agent.post('/users').send({
      name: 'User A',
      email: 'uses.a@test.com',
      password: 'usesa@004',
      _csrf: csrfToken
    })
    expect(res.statusCode).toBe(302)
  })
  test('Sign in as a user', async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')
  })
  test('View courses created by a educator', async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')
    const teaMyCoursesRes = await agent.get('/educatorcourses')
    expect(teaMyCoursesRes.statusCode).toBe(200)
  })
  test("View educator's dashboard", async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')

    const teacherDashboardRes = await agent.get('/educator')
    expect(teacherDashboardRes.statusCode).toBe(200)
  })
  test("View student's dashboard", async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')

    const teacherDashboardRes = await agent.get('/student')
    expect(teacherDashboardRes.statusCode).toBe(200)
  })
  test('View enrolled courses', async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')

    const EnrolledDashboardRes = await agent.get('/student')
    expect(EnrolledDashboardRes.statusCode).toBe(200)
  })
  test('Change Password', async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')

    const csrfToken = extractCsrfToken(await agent.get('/changePassword'))

    const newPassword = 'newPass123'

    const changePasswordResponse = await agent.post('/changePassword').send({
      userEmail: 'uses.a@test.com',
      newPassword,
      _csrf: csrfToken
    })

    expect(changePasswordResponse.statusCode).toBe(302)
    await login(agent, 'uses.a@test.com', newPassword)

    const loginResponse = await agent.get('/student')
    expect(loginResponse.statusCode).toBe(200)
  })
  test('Create a new course', async () => {
    await login(agent, 'uses.a@test.com', 'usesa@004')
    let csrfToken = extractCsrfToken(await agent.get('/courses'))

    const createCourseRes = await agent.post('/courses').send({
      courseName: 'New Course',
      courseDescription: 'Description for the new course.',
      _csrf: csrfToken
    })

    // Extract the relevant data from the response to send in the next request
    const { body: createdCourse } = createCourseRes

    // Assign the courseId for use in the next test case
    courseId = createdCourse.id
    console.log(courseId)

    expect(createCourseRes.statusCode).toBe(302)
  })
  test('Sign out the user', async () => {
    res = await agent.get('/signout')
    expect(res.statusCode).toBe(302)

    res = await agent.get('/educator')
    expect(res.statusCode).toBe(302)

    res = await agent.get('/student')
    expect(res.statusCode).toBe(302)
  })
})
