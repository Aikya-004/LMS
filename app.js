const express = require('express')
const app = express()
const { Course, Chapter, Page } = require('./models')
const bodyParser = require('body-parser')
const path = require('path')
app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.get('/', (request, response) => {
  response.render('index')
})
app.get('/signup', (request, response) => {
  response.render('signup')
})
app.get('/login', (request, response) => {
  response.render('login')
})
app.get('/educator', (request, response) => {
  response.render('educator', { name: 'Educator Dashboard' })
})
// Course Routes
app.get('/course', (request, response) => {
  response.render('course')
})
app.get('/courses', (request, response) => {
  console.log('Available Courses')
})
app.post('/courses', async (request, response) => {
  console.log('Creating a course', request.body)
  try {
    const course = await Course.create({
      courseName: request.body.courseName,
      courseDescription: request.body.courseDescription
    })
    return response.json(course)
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.get('/courses/:courseId', async (request, response) => {
  try {
    const course = await Course.findByPk(request.params.courseId)
    const chapters = await Chapter.findAll({
      where: { courseId: request.params.courseId }
    })
    if (course) {
      response.json({
        courseName: course.courseName,
        courseId: course.id,
        courseDescription: course.courseDescription,
        chapters
      })
    } else {
      // Handle the case where the course with the given ID is not found
      response.status(404).json({ error: 'Course not found' })
    }
  } catch (error) {
    console.log('Error while rendering Course Index page')
    return response.status(422).json(error)
  }
})
// app.delete('courses/:id', (request, response) => {
//   console.log('Delete a course with a ID:', request.params.id)
// })
// Chapter Routes
app.get('/chapter', async (request, response) => {
  console.log('Available chapters')
})
app.post('/chapter', async (request, response) => {
  console.log('Creating a chapter', request.body)
  try {
    const newChapter = await Chapter.create({
      chapterName: request.body.chapterName,
      chapterDescription: request.body.chapterDescription,
      courseId: request.body.courseId
    })
    console.log('New Chapter added Successfully')
    return response.json(newChapter)
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
// Page Routes
app.get('/page', (request, response) => {
  console.log('Available pages')
})
app.post('/page', async (request, response) => {
  console.log('Creating a page', request.body)
  try {
    const newPage = await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId: request.body.chapterId
    })
    console.log('New Page added Successfully')
    return response.json(newPage)
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.put('page/:id/markAsCompleted', (request, response) => {
  console.log(
    'We have to update a page as Completed with ID:',
    request.params.id
  )
})

module.exports = app
