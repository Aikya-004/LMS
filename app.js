const express = require('express')
const app = express()
const { Course } = require('./models')
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
    const course = await Course.create({ courseName: request.body.courseName, courseDescription: request.body.courseDescription })
    return response.json(course)
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.delete('courses/:id', (request, response) => {
  console.log('Delete a course with a ID:', request.params.id)
})
// Chapter Routes
app.get('/chapter', (request, response) => {
  console.log('Available chapters')
})
app.post('/chapter', (request, response) => {
  console.log('Creating a chapter', request.body)
})
// Page Routes
app.get('/page', (request, response) => {
  console.log('Available pages')
})
app.post('/page', (request, response) => {
  console.log('Creating a page', request.body)
})
app.put('page/:id/markAsCompleted', (request, response) => {
  console.log('We have to update a page as Completed with ID:', request.params.id)
})

module.exports = app
