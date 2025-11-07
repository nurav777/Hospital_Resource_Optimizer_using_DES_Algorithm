const AuthService = require('../services/AuthService');

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await AuthService.register(email, password, role);
    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ message: error.message || error });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: error.message || error });
  }
};

module.exports = { register, login };
