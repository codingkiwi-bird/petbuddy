const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'shrlgur03@',
  database: 'pet_buddy',
  port: 3307,
  charset: 'utf8mb4'
};

async function checkUsers() {
  let connection;
  
  try {
    console.log('🔍 데이터베이스 연결 중...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ MySQL 연결 성공!');
    
    // 사용자 목록 조회
    console.log('\n👥 등록된 사용자 목록:');
    const [users] = await connection.execute('SELECT id, email, full_name, phone, created_at FROM users ORDER BY created_at DESC LIMIT 10');
    
    if (users.length === 0) {
      console.log('  등록된 사용자가 없습니다.');
    } else {
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.full_name} (${user.email})`);
        console.log(`     - ID: ${user.id}`);
        console.log(`     - 전화: ${user.phone || '없음'}`);
        console.log(`     - 가입일: ${user.created_at}`);
        console.log('');
      });
    }
    
    console.log(`📊 총 사용자 수: ${users.length}명`);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 데이터베이스 연결 종료');
    }
  }
}

checkUsers();

