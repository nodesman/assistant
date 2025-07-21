// migrations/2_add_task_details.js
exports.up = function(knex) {
  return knex.schema.table('tasks', function(table) {
    table.integer('duration'); // Duration in minutes
    table.integer('minChunk'); // Minimum chunk size in minutes
    table.string('location'); // Geographic location
  });
};

exports.down = function(knex) {
  return knex.schema.table('tasks', function(table) {
    table.dropColumn('duration');
    table.dropColumn('minChunk');
    table.dropColumn('location');
  });
};
