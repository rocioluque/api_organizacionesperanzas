const { v4: uuidv4 } = require('uuid');

class User {
  constructor(username, password, role, categories = []) {
    this.id = `user_${uuidv4()}`;
    this.username = username;
    this.password = password;
    this.role = role;
    this.assignedCategories = categories;
  }
}

module.exports = User;