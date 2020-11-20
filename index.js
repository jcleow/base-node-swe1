// import as default pkg
import pg from 'pg';

const { Client } = pg;

// set the way we will connect to the server
const pgConnectionConfigs = {
  user: process.env.USER,
  host: 'localhost',
  database: 'mealsdb',
  port: 5432,
};

// create the var we'll use
const client = new Client(pgConnectionConfigs);

// make the connection
client.connect();

// Function that prints out all the items in each row of a table
const printResults = (rawResultsRow) => {
  const COL_INDEX_WAS_HUNGRY_BEFORE_EATING = 4;
  // rows key has the data
  rawResultsRow.forEach((row) => {
    let isHungryText;
    if (row[COL_INDEX_WAS_HUNGRY_BEFORE_EATING] === true) {
      isHungryText = 'felt hungry';
    } else {
      isHungryText = 'was not feeling hungry';
    }
    let content = '';
    row.forEach((field) => {
      content += `${field} - `;
      if (typeof (field) === 'boolean') {
        content += isHungryText;
      }
    });
    console.log(content);
  });
};

// create the query done callback
const whenQueryDone = (error, result) => {
  // this error is anything that goes wrong with the query
  if (error) {
    console.log('error', error);
    return;
  }

  if (process.argv[2] === 'report' && process.argv[3] !== 'edit' && process.argv[3]) {
    let criterion = process.argv[3];
    if (criterion === 'hungry') {
      criterion = true;
    } else if (criterion === 'not-hungry') {
      criterion = false;
    }

    const filteredResults = result.rows.filter((row) => row.includes(criterion));
    printResults(filteredResults);
  } else if (!process.argv[3]) {
    printResults(result.rows);
  } else {
    console.log(result.rows);
  }
  // close the connection
  client.end();
};

let sqlQuery;

if (process.argv[2] === 'log') {
  sqlQuery = {
    text: 'INSERT INTO meals(type,description,amount_of_alcohol,was_hungry_before_eating) VALUES($1,$2,$3,$4) RETURNING *',
    values: [process.argv[3], process.argv[4], Number(process.argv[5]), Boolean(process.argv[6])],

  };
} else if (process.argv[2] === 'report') {
  // e.g node index.js report edit 1 lunch laksa
  // where argv[3] = edit
  // where argv[4] = id
  // where argv[5] = type
  // where argv[6] = description
  // where argv[7] = amount_of_alcohol
  // where argv[8] = was_hungry_before_eating
  const argList = ['_', '_', '_', '_', 'id', 'type', 'description', 'amount_of_alcohol', 'was_hungry_before_eating'];
  if (process.argv[3] === 'edit') {
    sqlQuery = {
      text: 'UPDATE meals SET ',
      rowMode: 'array',
    };
    for (let i = 5; i <= 8; i += 1) {
      if (process.argv[i]) {
        sqlQuery.text += `${argList[i]}='${process.argv[i]}'`;
        if (process.argv[i + 1]) {
          sqlQuery.text += ',';
        }
      }
    }
    sqlQuery.text += `WHERE id = ${Number(process.argv[4])} RETURNING *`;
  } else {
    // write the SQL query
    sqlQuery = {
      text: 'SELECT * FROM meals',
      rowMode: 'array',
    };
  }
} else if (process.argv[2] === 'edit') {
  // node index.js edit 1 type breakfast
  sqlQuery = {
    text: `UPDATE meals SET ${process.argv[4]}='${process.argv[5]}' WHERE id = ${Number(process.argv[3])} RETURNING *`,
  };
}

client.query(sqlQuery, whenQueryDone);
