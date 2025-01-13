const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Parse JSON and url-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: Date
}); 

const userExerciseLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  log: [exerciseSchema]
});

const LogModel = mongoose.model('LogModel', userExerciseLogSchema);

app.post('/api/users', async (req, res) => {
  let uelog = await LogModel.findOne({username: req.body.username}, 'username _id');
  if(!uelog){
    uelog = new LogModel({username: req.body.username});
    await uelog.save();
  }
  res.json({username: uelog.username, _id: uelog._id});
});

app.get('/api/users', async (req, res) => {
  let alluelog = await LogModel.find({}, 'username _id');
  res.json(alluelog);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  let uelog = await LogModel.findById(req.params._id);
  if(!uelog){
    res.json({error: '_id not found'});
  }
  uelog.log.push({description: req.body.description, duration: req.body.duration, date: req.body.date ? new Date(req.body.date) : new Date()})
  uelog.count = uelog.count + 1;
  await uelog.save();
  res.json({
    username: uelog.username, 
    _id: uelog._id,
    description: uelog.log[uelog.count-1].description,
    duration: uelog.log[uelog.count-1].duration,
    date: uelog.log[uelog.count-1].date.toDateString(),
  });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let uelog = await LogModel.findById(req.params._id, "username count _id log");
  if(!uelog){
    res.json({error: '_id not found'});
  }
  let logs = uelog.log;
 
  if(req.query.from){
    logs = logs.filter(ex => ex.date >= new Date(req.query.from));
  }

  if(req.query.to){
    logs = logs.filter(ex => {let toDate = new Date(req.query.to); toDate.setDate(toDate.getDate() + 1); return ex.date < toDate;});
  }

  if(req.query.limit){
    logs=logs.slice(0, req.query.limit);
  }
  
  logs = logs.map(ex => {const newex = {description: ex.description, duration: ex.duration, date: ex.date.toDateString()}; return newex;});
  res.json({username: uelog.username, count: logs.length, _id: uelog._id, log: logs});
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
