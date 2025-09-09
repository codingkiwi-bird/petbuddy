const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'shrlgur03@',
  database: 'pet_buddy',
  port: 3307,
  charset: 'utf8mb4'
};

async function setupJobsTables() {
  let connection;
  try {
    console.log('🔍 데이터베이스 연결 중...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ MySQL 연결 성공!');

    console.log('📋 job_postings 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS job_postings (
        job_id INT PRIMARY KEY AUTO_INCREMENT,
        owner_id VARCHAR(36) NOT NULL,
        dog_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        location VARCHAR(100),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('active','closed','completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ job_postings 테이블 생성 완료');

    console.log('\n📊 생성된 공고 관련 테이블:');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'job_postings'");
    tables.forEach(t => console.log('  -', Object.values(t)[0]));
    console.log('\n🎉 공고 테이블 설정 완료!');
  } catch (e) {
    console.error('❌ 공고 테이블 설정 실패:', e);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 데이터베이스 연결 종료');
    }
  }
}

setupJobsTables();

