/**
 * Created by mgao on 2/11/15.
 */
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('accessverify');
});

module.exports = router;
