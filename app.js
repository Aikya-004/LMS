/* eslint-disable no-undef */
const express = require('express')
const app = express()
const { Course, Chapter, Page } = require('./models')
const bodyParser = require('body-parser')
const path = require('path')
app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: false }))
app.get('/', (request, response) => {
  response.render('index', { title: 'LMS' })
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
app.get('/educatorcourses', async (request, response) => {
  try {
    const courses = await Course.findAll({
      include: [{ model: Chapter }]
    })

    response.render('educourses', { courses })
  } catch (error) {
    console.log('Error while rendering Educator Courses page')
    return response.status(500).json(error)
  }
})
app.get('/educatorcourses/:courseId', async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId, {
      include: [{ model: Chapter }]
    })

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }

    const courses = await Course.findAll({
      include: [{ model: Chapter }]
    })

    response.render('educourses', { course, courses })
  } catch (error) {
    console.error('Error while rendering Educator Courses page', error)
    return response.status(500).json(error)
  }
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
app.delete('/courses/:id', async (request, response) => {
  const courseId = request.params.id

  console.log('We have to delete a course with ID: ', courseId)

  try {
    // Find all chapters associated with the course
    const chapters = await Chapter.findAll({ where: { courseId } })

    // Delete all pages associated with the chapters
    for (const chapter of chapters) {
      await Page.destroy({ where: { chapterId: chapter.id } })
    }

    // Delete all chapters associated with the course
    await Chapter.destroy({ where: { courseId } })

    // Delete the course
    const status = await Course.remove(courseId)

    // eslint-disable-next-line no-unneeded-ternary
    return response.json(status ? true : false)
  } catch (err) {
    console.error(err)
    return response.status(422).json(err)
  }
})
// Chapter Routes
app.get('/chapter', async (request, response) => {
  console.log('Available chapters')
})
app.post('/chapter/:courseId', async (request, response) => {
  try {
    const courseId = parseInt(request.params.courseId, 10)
    const course = await Course.findByPk(courseId)

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }

    await Chapter.create({
      chapterName: request.body.chapterName,
      chapterDescription: request.body.chapterDescription,
      courseId // Use the courseId from URL parameters
    })

    console.log('New Chapter added successfully')
    response.redirect(`/chapters/${courseId}`)
  } catch (error) {
    console.error('Error creating a chapter', error)
    response.status(422).json(error)
  }
})

app.get('/chapters/:courseId', async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId)
    const chapters = await Chapter.findAll({
      where: { courseId }
    })

    response.render('chapter', { course, chapters })
  } catch (error) {
    console.error('Error while rendering Chapters page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.post('/chapter', async (request, response) => {
  try {
    const course = await Course.findByPk(request.body.courseId)

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }
    await Chapter.create({
      chapterName: request.body.chapterName,
      chapterDescription: request.body.chapterDescription,
      courseId: request.body.courseId
    })

    console.log('New Chapter added successfully')
    response.redirect(`/chapters/${request.body.courseId}`)
  } catch (error) {
    console.error('Error creating a chapter', error)
    response.status(422).json(error)
  }
})
// Page Routes
app.get('/page', (request, response) => {
  console.log('Available pages')
})
app.post('/page/:chapterId', async (request, response) => {
  try {
    const chapterId = parseInt(request.params.chapterId, 10)
    const chapter = await Chapter.findByPk(chapterId)

    if (!chapter) {
      console.log('Chapter not found')
      return response.status(404).send('Chapter not found')
    }

    await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId // Use the courseId from URL parameters
    })

    console.log('New Page added successfully')
    response.redirect(`/pages/${chapterId}`)
  } catch (error) {
    console.error('Error creating a page', error)
    response.status(422).json(error)
  }
})
app.get('/pages/:chapterId', async (request, response) => {
  try {
    const chapterId = request.params.chapterId
    const chapter = await Chapter.findByPk(chapterId)
    const pages = await Page.findAll({
      where: { chapterId }
    })

    response.render('page', { chapter, pages })
  } catch (error) {
    console.error('Error while rendering Pages page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.post('/page', async (request, response) => {
  console.log('Creating a page', request.body)
  try {
    const chapter = await Course.findByPk(request.body.chapterId)

    if (!chapter) {
      console.log('Chapter not found')
      return response.status(404).send('Chapter not found')
    }
    await Page.create({
      title: request.body.title,
      content: request.body.content,
      chapterId: request.body.chapterId
    })
    console.log('New Page added Successfully')
    response.redirect(`/pages/${request.body.chapterId}`)
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
