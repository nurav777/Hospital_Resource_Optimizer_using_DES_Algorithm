const FeedbackService = require('../services/FeedbackService');
const DynamoDBService = require('../services/DynamoDBService');

const getPatients = async (req, res) => {
  // Mock patient data for demonstration
  const patients = [
    { id: 1, name: 'Patient A', schedule: 'Mon 10am', status: 'Assigned' },
    { id: 2, name: 'Patient B', schedule: 'Tue 2pm', status: 'Assigned' },
    { id: 3, name: 'Patient C', schedule: 'Wed 11am', status: 'Assigned' }
  ];
  res.json(patients);
};

const submitFeedback = async (req, res) => {
  try {
    const feedbackData = req.body;
    const feedback = await FeedbackService.submitFeedback(req.user._id, feedbackData);
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackService.getFeedbacks(req.user._id);
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addPatient = async (req, res) => {
  try {
    const patientData = { ...req.body, userId: req.user._id };
    // Validate required fields (can expand as needed)
    if (!patientData.name || !patientData.condition || !patientData.admittedAt) {
      return res.status(400).json({ message: 'Name, condition, and admission time required.' });
    }
    const patient = await DynamoDBService.createPatient(patientData);
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllPatients = async (req, res) => {
  try {
    const patients = await DynamoDBService.getPatients();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPatients, submitFeedback, getFeedbacks, addPatient, getAllPatients };
