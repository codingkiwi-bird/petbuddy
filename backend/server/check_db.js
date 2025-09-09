require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkDatabase() {
  const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'shrlgur03@',
    database: 'pet_buddy',
    port: 3307,
    charset: 'utf8mb4'
  }

  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Check table structure
    console.log('=== Dogs Table Structure ===')
    const [columns] = await connection.execute('SHOW COLUMNS FROM dogs')
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type}`)
    })
    
    // Check dogs with name containing 콜라
    console.log('\n=== Dogs with name containing 콜라 ===')
    const [dogs] = await connection.execute("SELECT * FROM dogs WHERE name LIKE '%콜라%'")
    console.log('Found dogs:', dogs.length)
    dogs.forEach(dog => {
      console.log(`ID: ${dog.id}, Name: ${dog.name}`)
      console.log(`DBTI fields:`)
      console.log(`- dbti: ${dog.dbti}`)
      console.log(`- DBTI: ${dog.DBTI}`)
      console.log(`- dbtiType: ${dog.dbtiType}`)
      console.log(`- personality: ${dog.personality}`)
      console.log(`- profile_image_url: ${dog.profile_image_url}`)
      console.log(`- photo: ${dog.photo}`)
      console.log('---')
    })
    
    await connection.end()
  } catch (error) {
    console.error('Database error:', error)
  }
}

checkDatabase()