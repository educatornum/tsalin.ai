const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { userValidationRules } = require('../middleware/validators');

router
  .route('/')
  .get(getUsers)
  .post(userValidationRules(), createUser);

router
  .route('/:id')
  .get(getUser)
  .put(userValidationRules(), updateUser)
  .delete(deleteUser);

module.exports = router;

