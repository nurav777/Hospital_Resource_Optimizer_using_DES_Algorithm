const UserService = require('../services/UserService');

const listUsers = async (req, res) => {
  try {
    const users = await UserService.listUsers();
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

const deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.email, req.user.email);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

const addUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const newUser = await UserService.createUser({ email, password });
    res.status(201).json({ _id: newUser._id, email: newUser.email, role: newUser.role });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

module.exports = { listUsers, deleteUser, addUser };
