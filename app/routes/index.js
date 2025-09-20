var express = require('express');
var router = express.Router();
const db = require('../db');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/roomForm', async function(req, res, next) {
  try {
    const [rooms] = await db.query('SELECT * FROM rooms');
    res.render('roomForm', { rooms: rooms });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
