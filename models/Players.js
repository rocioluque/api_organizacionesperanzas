const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(categoryId, firstName, lastName, teamId = null, birthDate = null, photoUrl = null, status = 'PENDING') {
    this.id = `player_${uuidv4()}`;
    this.categoryId = categoryId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.teamId = teamId; 
    this.birthDate = birthDate;
    this.photoUrl = photoUrl;
    this.status = status;
  }
}

module.exports = Player;