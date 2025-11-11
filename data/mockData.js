// Mock data sin dependencias de modelos
const categories = [
  { id: 'cat_1_1', name: 'Sub-10' },
  { id: 'cat_1_2', name: 'Sub-12' },
  { id: 'cat_1_3', name: 'Sub-14' },
  { id: 'cat_1_4', name: 'Sub-16' },
];

const users = [
  {
    id: 'user_abc_456',
    username: 'delegate@example.com',
    password: 'password123',
    role: 'DELEGATE',
    assignedCategories: [
      { teamName: 'Los Halcones', category: categories[0] },
      { teamName: 'Los Halcones', category: categories[1] }
    ]
  },
  {
    id: 'user_xyz_789',
    username: 'organizer@example.com',
    password: 'admin123',
    role: 'ORGANIZER',
    assignedCategories: []
  },
];

let players = [
  {
    id: 'player_xyz_123',
    categoryId: 'cat_1_1',
    firstName: 'Leo',
    lastName: 'Messi',
    birthDate: '24/06/1987',
    photoUrl: 'https://example.com/photo.jpg',
    status: 'APPROVED'
  },
  {
    id: 'player_abc_456',
    categoryId: 'cat_1_1',
    firstName: 'Cristiano',
    lastName: 'Ronaldo',
    birthDate: '05/02/1985',
    photoUrl: null,
    status: 'PENDING'
  },
  {
    id: 'player_def_789',
    categoryId: 'cat_1_2',
    firstName: 'Neymar',
    lastName: 'Jr',
    birthDate: '05/02/1992',
    photoUrl: null,
    status: 'APPROVED'
  }
];

module.exports = {
  categories,
  users,
  players
};