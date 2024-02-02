/* eslint-disable no-undef */
const express = require('express')
var csrf = require('csurf')
const app = express()
const { Course, Chapter, Page, User, Enrollment } = require('./models')
const bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
const path = require('path')

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const connectEnsureLogin = require('connect-ensure-login')
const bcrypt = require('bcrypt')
const saltRounds = 10

app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser('shh!Some secret string'))
app.use(csrf({ cookie: true }))

app.use(session({
  secret: 'my-super-secret-key-2344534532',
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}))
app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (username, password, done) => {
  User.findOne({ where: { email: username } })
    .then(async (user) => {
      if (!user) {
        return done(null, false, { message: 'User not found' })
      }
      const result = await bcrypt.compare(password, user.password)

      if (!result) {
        return done(null, false, { message: 'Invalid password' })
      }
      if (user.role === 'educator') {
        return done(null, user, { role: 'educator' })
      } else if (user.role === 'student') {
        return done(null, user, { role: 'student' })
      } else {
        return done(null, false, { message: 'Unknown role' })
      }
    })
    .catch((error) => {
      return (error)
    })
}))

passport.serializeUser((user, done) => {
  console.log('Serializing user in session', user.id)
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then(user => {
      done(null, user)
    })
    .catch(error => {
      done(error, null)
    })
})

// user Routes
app.get('/', (request, response) => {
  response.render('index', { title: 'LMS', csrfToken: request.csrfToken() })
})
app.get('/signup', (request, response) => {
  response.render('signup', { title: 'Signup', csrfToken: request.csrfToken() })
})
app.get('/login', (request, response) => {
  response.render('login', { title: 'Login', csrfToken: request.csrfToken() })
})
app.get('/signout', (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err)
    }
    response.redirect('/')
  })
})
app.get('/educator', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  const currentUser = request.user
  response.render('educator', { name: currentUser.name })
})

app.post('/users', async (request, response) => {
  console.log('Name', request.body.name)
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds)
  console.log(hashedPwd)
  try {
    const user = await User.create({
      name: request.body.name,
      email: request.body.email,
      password: hashedPwd,
      role: request.body.role
    })
    console.log('User role', user.role)
    request.login(user, (error) => {
      if (error) {
        console.log(error)
        console.log('An error occurred during login through user')
      }
      response.redirect(`/${user.role}`)
    }
    )
  } catch (error) {
    console.log('Error while crerating a new User')
    console.log(error)
    response.status(500).json(error)
  }
})

// Course Routes
app.get('/course', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  response.render('course', { csrfToken: request.csrfToken() })
})
app.post('/session', passport.authenticate('local', { failureRedirect: '/login' }), (request, response) => {
  if (request.user.role === 'student') {
    response.redirect('/student')
  } else if (request.user.role === 'educator') {
    response.redirect('/educator')
  } else {
    response.redirect('/login')
  }
})
app.get('/educatorcourses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const currentUser = await User.findByPk(request.user.id)
    const courses = await Course.findAll({
      where: { userId: request.user.id },
      include: [{ model: Chapter }]
    })

    response.render('educourses', { courses, currentUser, csrfToken: request.csrfToken() })
  } catch (error) {
    console.log('Error while rendering Educator Courses page')
    return response.status(500).json(error)
  }
})
app.get('/courses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const currentUser = await User.findByPk(request.user.id)
  response.render('course', {
    title: 'Create New Course',
    currentUser,
    csrfToken: request.csrfToken()
  })
}
)
app.get('/educatorcourses/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const currentUser = request.user.id
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId, {
      where: { userId: request.user.id },
      include: [{ model: Chapter }]
    })

    if (!course) {
      console.log('Course not found')
      return response.status(404).send('Course not found')
    }

    const courses = await Course.findAll({
      include: [{ model: Chapter }]
    })

    response.render('educourses', { course, courses, currentUser, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Educator Courses page', error)
    return response.status(500).json(error)
  }
})

app.post('/courses', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log('Creating a course', request.body)
  const csrfToken = request.csrfToken()
  try {
    await Course.create({
      courseName: request.body.courseName,
      courseDescription: request.body.courseDescription,
      _csrf: csrfToken,
      userId: request.user.id
    })
    return response.redirect('/educatorcourses')
  } catch (error) {
    console.log(error)
    return response.status(422).json(error)
  }
})
app.get('/courses/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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
app.delete('/courses/:id', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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
    const deletedCourse = await Course.remove(courseId)

    // Check if the course was successfully deleted
    if (deletedCourse) {
      return response.json({
        success: true,
        message: 'Course deleted successfully'
      })
    } else {
      return response.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }
  } catch (err) {
    console.error(err)
    return response.status(422).json(err)
  }
})
// Chapter Routes
app.get('/chapter', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log('Available chapters')
})
app.post('/chapter/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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

app.get('/chapters/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId)
    const chapters = await Chapter.findAll({
      where: { courseId }
    })

    response.render('chapter', { course, chapters, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Chapters page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.post('/chapter', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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
app.get('/page', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  console.log('Available pages')
})

app.post('/page/:chapterId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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

app.get('/pages/:chapterId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const chapterId = request.params.chapterId
    const chapter = await Chapter.findByPk(chapterId)
    const pages = await Page.findAll({
      where: { chapterId }
    })

    response.render('page', { chapter, pages, csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering Pages page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post('/page', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
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

// Student Routes
// app.get('/student', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
//   console.log('student logged in successfully')
//   const availableCourses = await Course.findAll()
//   // const enrollments = await Enrollment.findAll({ where: { userId: request.user.id } })
//   const enrolledCoursesIds = enrollments.map((enrollment) => enrollment.courseId)
//   const enrolledCourses = await Course.findAll({ where: { id: enrolledCoursesIds } })
//   try {
//     await response.render('student', {
//       studentName: request.user.name,
//       // studentId: request.user.id,
//       availableCourses,
//       enrolledCourses

//     })
//   } catch (error) {
//     console.log('Error while rendering the Student Homepage')
//     console.log(error)
//   }
// })
app.get('/student', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  let availableCourses
  let enrolledCourses

  Course.findAll()
    .then((courses) => {
      availableCourses = courses

      return Enrollment.findAll({ where: { userId: request.user.id } })
    })
    .then((enrollments) => {
      const enrolledCoursesIds = enrollments.map((enrollment) => enrollment.courseId)

      return Course.findAll({ where: { id: enrolledCoursesIds } })
    })
    .then((courses) => {
      enrolledCourses = courses

      // Render the student view with data
      response.render('student', {
        studentName: request.user.name,
        availableCourses,
        enrolledCourses
      })
    })
    .catch((error) => {
      console.error('Error fetching data for student:', error)
      response.status(500).send('Internal Server Error')
    })
})

app.get('/view-courses/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = parseInt(request.params.courseId, 10)

    if (isNaN(courseId)) {
      return response.status(400).send('Invalid course ID')
    }

    const course = await Course.findByPk(courseId, { include: Chapter })
    if (!course) {
      return response.status(404).send('Course not found')
    }

    const enrollments = await Enrollment.findAll({ where: { userId: request.user.id } })
    const enrolledCoursesIds = enrollments.map((enrollment) => enrollment.courseId)
    const enrolledCourses = await Course.findAll({ where: { id: enrolledCoursesIds } })

    response.render('viewcourses', {
      course,
      enrolledCourses,
      csrfToken: request.csrfToken()
    })
  } catch (error) {
    console.error('Error fetching data for student:', error)
    response.status(500).send('Internal Server Error')
  }
})
app.get('/view-chapters/:courseId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = request.params.courseId
    const course = await Course.findByPk(courseId)
    const chapters = await Chapter.findAll({
      where: { courseId }
    })

    response.render('viewchapters', { selectedCourse: course, chapters, selectedChapter: null, pages: [], csrfToken: request.csrfToken() })
  } catch (error) {
    console.error('Error while rendering View Chapters page', error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
})
app.get('/course/:courseId/chapter/:chapterId', async (request, response) => {
  try {
    const courseId = parseInt(request.params.courseId, 10)

    const chapterId = parseInt(request.params.chapterId, 10)

    if (isNaN(courseId) || isNaN(chapterId)) {
      return response.status(400).send('Invalid course or chapter ID')
    }

    const selectedCourse = await Course.findByPk(courseId, { include: Chapter })
    if (!selectedCourse) {
      return response.status(404).send('Course not found')
    }

    const selectedChapter = await Chapter.findByPk(chapterId, { include: Page })
    if (!selectedChapter || selectedChapter.courseId !== courseId) {
      return response.status(404).send('Chapter not found')
    }

    const pages = selectedChapter.Pages || []

    response.render('viewpages', {
      selectedCourse,
      selectedChapter,
      pages
    })
  } catch (error) {
    console.error('Error fetching data for course/chapter:', error)
    response.status(500).send('Internal Server Error')
  }
})
app.post('/enroll', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const courseId = request.body.courseId
    const userId = request.user.id

    // Check if the user is already enrolled in the course
    const existingEnrollment = await Enrollment.findOne({
      where: { userId, courseId }
    })

    if (existingEnrollment) {
      return response.status(400).send('Already enrolled in this course.')
    }

    // Create a new enrollment
    await Enrollment.create({ userId, courseId })
    console.log('Enrolled Successfully')
    response.redirect('/student')
  } catch (error) {
    console.error('Error enrolling in the course', error)
    response.status(500).send('Internal Server Error')
  }
})

app.put('page/:id/markAsCompleted', connectEnsureLogin.ensureLoggedIn(), (request, response) => {
  console.log(
    'We have to update a page as Completed with ID:',
    request.params.id
  )
})

module.exports = app
