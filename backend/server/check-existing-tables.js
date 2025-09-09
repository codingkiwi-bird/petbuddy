const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'shrlgur03@',
  database: 'pet_buddy',
  port: 3307,
  charset: 'utf8mb4'
};

async function checkTables() {
  let connection;
  
  try {
    console.log('🔍 데이터베이스 연결 중...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ MySQL 연결 성공!');
    
    // 기존 테이블 확인
    console.log('\n📊 기존 테이블 목록:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // users 테이블 구조 확인
    if (tables.some(t => Object.values(t)[0] === 'users')) {
      console.log('\n📋 기존 users 테이블 구조:');
      const [columns] = await connection.execute('DESCRIBE users');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL 허용)' : '(NOT NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
    }
    
    console.log('\n✅ 확인 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 데이터베이스 연결 종료');
    }
  }
}

checkTables();

