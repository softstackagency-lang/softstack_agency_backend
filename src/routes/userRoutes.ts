import { Router } from 'express'
import {
  getUser,
  listUsers,
  updateUser,
  deleteUser,
} from '../controllers/userController'

const router = Router()

router.get('/', listUsers)
router.get('/:uid', getUser)
router.put('/:uid', updateUser)
router.delete('/:uid', deleteUser)

export default router
