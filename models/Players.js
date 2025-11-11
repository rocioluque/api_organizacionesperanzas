const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(categoryId, firstName, lastName, birthDate = null, photoUrl = null, status = 'PENDING') {
    this.id = `player_${uuidv4()}`;
    this.categoryId = categoryId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.birthDate = birthDate;
    this.photoUrl = photoUrl;
    this.status = status;
  }
}

module.exports = Player;