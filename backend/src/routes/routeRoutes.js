const express = require('express');   
const router = express.Router();   
const routeController = require('../controllers/routeController');   
   
// POST /api/routes/search - Search for routes   
router.post('/search', routeController.searchRoutes.bind(routeController));   
   
// GET /api/routes/graph/stats - Get graph statistics   
router.get('/graph/stats', routeController.getGraphStats.bind(routeController));   
   
module.exports = router;   
 