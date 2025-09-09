require('dotenv').config()
const mysql = require('mysql2/promise')
const { v4: uuidv4 } = require('uuid')

// 데이터베이스 연결 설정 (직접 설정)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'shrlgur03@',  // 원래 비밀번호로 변경
  database: 'pet_buddy',
  port: 3307,
  charset: 'utf8mb4'
}

// 연결 풀 생성
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

// 연결 테스트 함수
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('🔍 데이터베이스 연결 테스트 중...')
    
    const [rows] = await connection.execute('SELECT 1 as test')
    console.log('✅ MySQL 연결 성공!')
    
    const [dbInfo] = await connection.execute('SELECT DATABASE() as currentDB')
    console.log('📁 현재 데이터베이스:', dbInfo[0].currentDB)
    
    // 테이블 존재 확인
    const tables = ['users', 'sitters', 'dogs', 'bookings', 'sitter_postings', 'job_postings']
    for (const table of tables) {
      const [tableCheck] = await connection.execute(`SHOW TABLES LIKE '${table}'`)
      if (tableCheck.length > 0) {
        console.log(`✅ ${table} 테이블 확인됨`)
      } else {
        console.log(`⚠️  ${table} 테이블이 없습니다.`)
      }
    }
    
    connection.release()
    return true
  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error.message)
    return false
  }
}

// === USERS 테이블 함수들 ===

// 이메일로 사용자 찾기
async function findUserByEmail(email) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )
    return rows[0] || null
  } catch (error) {
    console.error('사용자 조회 실패:', error)
    throw error
  }
}

// ID로 사용자 찾기
async function findUserById(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [userId]
    )
    return rows[0] || null
  } catch (error) {
    console.error('사용자 조회 실패:', error)
    throw error
  }
}

// 새 사용자 생성 (users 컬럼 자동 감지)
async function createUser(userData) {
  const { email, password_hash, phone_number } = userData

  try {
    const [cols] = await pool.execute('SHOW COLUMNS FROM users')
    const names = cols.map(c => c.Field)
    const byName = Object.fromEntries(cols.map(c => [c.Field, c]))
    const passCol = names.includes('password_hash') ? 'password_hash' : (names.includes('password') ? 'password' : null)
    const phoneCol = names.includes('phone_number') ? 'phone_number' : (names.includes('phone') ? 'phone' : null)
    const hasFullName = names.includes('full_name')
    const needFullName = hasFullName && String(byName['full_name']?.Null || '').toUpperCase() === 'NO' && (byName['full_name']?.Default == null)

    const fields = []
    const params = []

    // If users.id exists and is NOT auto_increment and is NOT nullable, provide a UUID
    if (names.includes('id')) {
      const extra = String(byName['id']?.Extra || '').toLowerCase()
      const isAuto = extra.includes('auto_increment')
      const isNullable = String(byName['id']?.Null || '').toUpperCase() === 'YES'
      if (!isAuto && !isNullable) {
        const { v4: uuidv4 } = require('uuid')
        fields.push('id'); params.push(uuidv4())
      }
    }

    // If users.user_id exists and is NOT auto_increment and is NOT nullable, provide a numeric id
    if (names.includes('user_id')) {
      const extra = String(byName['user_id']?.Extra || '').toLowerCase()
      const isAuto = extra.includes('auto_increment')
      const isNullable = String(byName['user_id']?.Null || '').toUpperCase() === 'YES'
      if (!isAuto && !isNullable) {
        const type = String(byName['user_id']?.Type || '').toLowerCase()
        // generate safe positive int within 32-bit range
        const base = Math.floor(Date.now() / 1000)
        const rnd = Math.floor(Math.random() * 1000)
        const value = (base % 2147480000) + rnd
        fields.push('user_id'); params.push(type.includes('int') ? value : String(value))
      }
    }

    fields.push('email'); params.push(email)
    if (passCol) { fields.push(passCol); params.push(password_hash) }
    if (phoneCol) { fields.push(phoneCol); params.push(phone_number || null) }
    if (needFullName) { fields.push('full_name'); params.push(String(email).split('@')[0]) }

    const [result] = await pool.execute(
      `INSERT INTO users (${fields.join(', ')}) VALUES (${fields.map(()=>'?').join(', ')})`,
      params
    )
    console.log('✅ 새 사용자 생성 완료. ID:', result.insertId)
    return { success: true, userId: result.insertId }
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new Error('이미 존재하는 이메일 또는 전화번호입니다.')
    }
    console.error('사용자 생성 실패:', error)
    throw error
  }
}

// === SITTERS 테이블 함수들 ===

// 시터 프로필 생성
async function createSitterProfile(userId, sitterData) {
  const { self_introduction } = sitterData
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO sitters (user_id, self_introduction) VALUES (?, ?)',
      [userId, self_introduction || null]
    )
    
    console.log('✅ 시터 프로필 생성 완료. ID:', result.insertId)
    
    return {
      success: true,
      sitterId: result.insertId
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('이미 시터 프로필이 존재합니다.')
    }
    console.error('시터 프로필 생성 실패:', error)
    throw error
  }
}

// 시터 프로필 조회
async function getSitterByUserId(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, u.email, u.phone_number 
       FROM sitters s 
       JOIN users u ON s.user_id = u.user_id 
       WHERE s.user_id = ?`,
      [userId]
    )
    return rows[0] || null
  } catch (error) {
    console.error('시터 조회 실패:', error)
    throw error
  }
}

// 모든 시터 목록 조회
async function getAllSitters() {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, u.email, u.phone_number 
       FROM sitters s 
       JOIN users u ON s.user_id = u.user_id 
       ORDER BY s.total_earnings DESC`
    )
    return rows
  } catch (error) {
    console.error('시터 목록 조회 실패:', error)
    throw error
  }
}

// === DOGS 테이블 함수들 ===

// 반려견 등록
async function createDog(dogData) {
  const { user_id, name, profile_image_url, breed, personality, dbti, birth_date, special_notes } = dogData
  
  try {
    console.log('🐶 Creating dog with data:', { user_id, name, breed, personality, dbti, birth_date, special_notes })
    
    // 테이블 구조 확인 및 필요한 컬럼 추가
    const [columns] = await pool.execute('SHOW COLUMNS FROM dogs')
    const columnNames = columns.map(col => col.Field)
    console.log('📋 Dogs table columns:', columnNames)
    console.log('🔍 Looking for DBTI columns:', {
      hasDbti: columnNames.includes('dbti'),
      hasDbtiType: columnNames.includes('dbtiType'),
      hasDbti_type: columnNames.includes('dbti_type')
    })
    
    // dbti 또는 dbtiType 컬럼 확인
    let dbtiColumn = 'dbti'
    if (columnNames.includes('dbtiType')) {
      dbtiColumn = 'dbtiType'
      console.log('✅ Using existing dbtiType column')
    } else if (columnNames.includes('dbti_type')) {
      dbtiColumn = 'dbti_type'
      console.log('✅ Using existing dbti_type column')
    } else if (!columnNames.includes('dbti')) {
      console.log('🔧 Adding dbti column to dogs table...')
      await pool.execute('ALTER TABLE dogs ADD COLUMN dbti VARCHAR(20) DEFAULT NULL')
      console.log('✅ dbti column added successfully')
    }
    
    // birth_date 컬럼이 없으면 추가
    if (!columnNames.includes('birth_date')) {
      console.log('🔧 Adding birth_date column to dogs table...')
      await pool.execute('ALTER TABLE dogs ADD COLUMN birth_date DATE DEFAULT NULL')
      console.log('✅ birth_date column added successfully')
    }
    
    const dogId = uuidv4()
    console.log('💾 Using DBTI column:', dbtiColumn, 'with value:', dbti)
    
    // 동적으로 쿼리 생성
    const query = `INSERT INTO dogs (id, owner_id, name, breed, personality, ${dbtiColumn}, notes, photo_url, birth_date) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    
    await pool.execute(query, [
      dogId, 
      user_id, 
      name, 
      breed || null, 
      personality || null, 
      dbti || null, 
      special_notes || null, 
      profile_image_url || null, 
      birth_date || null
    ])
    
    console.log('✅ 반려견 등록 완료. ID:', dogId)
    
    return {
      success: true,
      dogId: dogId
    }
  } catch (error) {
    console.error('반려견 등록 실패:', error)
    throw error
  }
}

// 사용자의 반려견 목록 조회
async function getDogsByUserId(userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM dogs WHERE owner_id = ? ORDER BY created_at DESC',
      [userId]
    )
    console.log('🔍 Retrieved dogs for user:', userId)
    console.log('📝 Raw dog data:', rows)
    
    // 프론트엔드에 맞게 필드명 변환
    const dogs = rows.map(dog => ({
      ...dog,
      photo_url: dog.profile_image_url || dog.photo_url || null,
      // DBTI 필드 정규화 - 다양한 컬럼명 지원
      dbti: dog.dbti || dog.dbtiType || dog.dbti_type || null
    }))
    console.log('📤 Processed dogs data with DBTI:', dogs.map(d => ({ id: d.id, name: d.name, dbti: d.dbti })))
    return dogs
  } catch (error) {
    console.error('반려견 목록 조회 실패:', error)
    throw error
  }
}

// 반려견 삭제
async function deleteDogByIdOwner(dogId, ownerId) {
  try {
    const [result] = await pool.execute(
      'DELETE FROM dogs WHERE id = ? AND owner_id = ?',
      [dogId, ownerId]
    )
    return { success: result.affectedRows > 0, affectedRows: result.affectedRows }
  } catch (error) {
    console.error('반려견 삭제 실패:', error)
    throw error
  }
}

// === BOOKINGS 테이블 함수들 ===

// 예약 생성 (스키마 자동 감지 + ID 정규화)
async function createBooking(bookingData) {
  const rawOwner = bookingData.owner_user_id ?? bookingData.owner_id
  const rawSitter = bookingData.sitter_user_id ?? bookingData.sitter_id
  const rawDog = bookingData.dog_id ?? bookingData.dogId
  const { start_time, end_time } = bookingData

  if (!rawOwner || !rawSitter || !rawDog || !start_time || !end_time) {
    throw new Error('필수 필드 누락 (owner, sitter, dog, start_time, end_time)')
  }

  let connection
  try {
    connection = await pool.getConnection()

    // bookings 컬럼 감지
    const [bCols] = await connection.execute(`SHOW COLUMNS FROM bookings`)
    const bNames = bCols.map(c => c.Field)
    const ownerCol = bNames.includes('owner_user_id') ? 'owner_user_id' : (bNames.includes('owner_id') ? 'owner_id' : null)
    const sitterCol = bNames.includes('sitter_user_id') ? 'sitter_user_id' : (bNames.includes('sitter_id') ? 'sitter_id' : null)
    const dogCol = bNames.includes('dog_id') ? 'dog_id' : (bNames.includes('dogId') ? 'dogId' : null)
    const hasIdCol = bNames.includes('id')
    const hasStartTime = bNames.includes('start_time')
    const hasEndTime = bNames.includes('end_time')
    const hasStartDate = bNames.includes('start_date')
    const hasEndDate = bNames.includes('end_date')
    const hasStatus = bNames.includes('booking_status')
    const hasHourlyRate = bNames.includes('hourly_rate')
    const hasTotalAmount = bNames.includes('total_amount')
    const hasLocation = bNames.includes('location')
    if (!ownerCol || !sitterCol || !dogCol) {
      throw new Error('bookings 테이블 컬럼을 확인하세요 (owner/sitter/dog)')
    }

    // users 컬럼 감지 및 값 정규화
    const [uCols] = await connection.execute(`SHOW COLUMNS FROM users`)
    const uNames = uCols.map(c => c.Field)
    const usersPkUserId = uNames.includes('user_id')
    const usersAltId = uNames.includes('id')

    async function normalizeUserValue(input, targetIsUserId) {
      // 이미 숫자로 보이고 target이 user_id면 바로 사용 시도
      if (targetIsUserId && /^\d+$/.test(String(input))) return Number(input)
      // 쿼리로 매핑(id 또는 user_id에서 찾기)
      const [rows] = await connection.execute(
        `SELECT ${usersPkUserId ? 'user_id' : 'NULL'} AS user_id, ${usersAltId ? 'id' : 'NULL'} AS id FROM users 
         WHERE ${usersPkUserId ? 'user_id = ?' : '1=0'} ${usersAltId ? ' OR id = ?' : ''} LIMIT 1`,
        usersPkUserId && usersAltId ? [input, input] : (usersPkUserId ? [input] : [input])
      )
      const row = rows?.[0]
      if (!row) return null
      return targetIsUserId ? row.user_id : row.id
    }

    const ownerVal = await normalizeUserValue(rawOwner, ownerCol.endsWith('user_id'))
    const sitterVal = await normalizeUserValue(rawSitter, sitterCol.endsWith('user_id'))

    // dogs 컬럼 감지 및 값 정규화
    const [dCols] = await connection.execute(`SHOW COLUMNS FROM dogs`)
    const dNames = dCols.map(c => c.Field)
    const dogsHasDogId = dNames.includes('dog_id')
    const dogsHasId = dNames.includes('id')

    async function normalizeDogValue(input, targetCol) {
      const wantDogIdCol = targetCol.toLowerCase() === 'dog_id'
      // 숫자 FK 기대 시 숫자면 그대로 사용 (과거 INT 스키마 대비)
      if (wantDogIdCol && /^\d+$/.test(String(input))) return Number(input)
      // 매핑 시도: dogs.dog_id와 dogs.id 둘 다 조회해 가능한 값을 반환
      const [rows] = await connection.execute(
        `SELECT ${dogsHasDogId ? 'dog_id' : 'NULL'} AS dog_id, ${dogsHasId ? 'id' : 'NULL'} AS id FROM dogs 
         WHERE ${dogsHasDogId ? 'dog_id = ?' : '1=0'} ${dogsHasId ? ' OR id = ?' : ''} LIMIT 1`,
        dogsHasDogId && dogsHasId ? [input, input] : (dogsHasDogId ? [input] : [input])
      )
      const row = rows?.[0]
      if (!row) return null
      // 현재 스키마는 bookings.dog_id → dogs.id(UUID). dog_id 컬럼이 없으면 id 사용
      if (wantDogIdCol) return row.dog_id || row.id || input
      return row.id || row.dog_id || input
    }

    const dogVal = await normalizeDogValue(rawDog, dogCol)
    if (ownerVal == null) throw new Error('유효하지 않은 owner_id')
    if (sitterVal == null) throw new Error('유효하지 않은 sitter_id')
    if (dogVal == null) throw new Error('유효하지 않은 dog_id')

    // INSERT (동적 컬럼 채우기)
    const fields = []
    const params = []
    if (hasIdCol) { fields.push('id'); params.push(uuidv4()) }
    fields.push(ownerCol); params.push(ownerVal)
    fields.push(sitterCol); params.push(sitterVal)
    fields.push(dogCol); params.push(dogVal)
    if (hasStartTime) { fields.push('start_time'); params.push(start_time) }
    if (hasEndTime) { fields.push('end_time'); params.push(end_time) }
    if (hasLocation) { fields.push('location'); params.push(bookingData.location || '') }
    if (hasStartDate) { fields.push('start_date'); params.push(String(start_time).slice(0,10)) }
    if (hasEndDate) { fields.push('end_date'); params.push(String(end_time).slice(0,10)) }
    if (hasStatus) { fields.push('booking_status'); params.push('confirmed') }
    const hourly = Number(bookingData.hourly_rate ?? 0)
    if (hasHourlyRate) { fields.push('hourly_rate'); params.push(hourly) }
    if (hasTotalAmount) {
      let total = 0
      try {
        const startMs = new Date(start_time).getTime()
        const endMs = new Date(end_time).getTime()
        if (isFinite(startMs) && isFinite(endMs) && endMs > startMs) {
          const hours = (endMs - startMs) / (1000 * 60 * 60)
          total = Number((hourly * hours).toFixed(0))
        }
      } catch {}
      fields.push('total_amount'); params.push(total)
    }

    const [result] = await connection.execute(
      `INSERT INTO bookings (${fields.join(', ')}) VALUES (${fields.map(()=>'?').join(', ')})`,
      params
    )

    connection.release()
    console.log('✅ 예약 생성 완료. ID:', result.insertId)
    return { success: true, bookingId: result.insertId }
  } catch (error) {
    try { connection?.release() } catch {}
    console.error('예약 생성 실패:', error)
    throw error
  }
}

// 사용자의 예약 목록 조회 (견주 관점) - 스키마 자동 감지 조인
async function getBookingsByOwnerId(ownerId) {
  let connection
  try {
    connection = await pool.getConnection()
    // bookings
    const [bCols] = await connection.execute(`SHOW COLUMNS FROM bookings`)
    const b = bCols.map(c => c.Field)
    const ownerCol = b.includes('owner_user_id') ? 'owner_user_id' : (b.includes('owner_id') ? 'owner_id' : null)
    const sitterCol = b.includes('sitter_user_id') ? 'sitter_user_id' : (b.includes('sitter_id') ? 'sitter_id' : null)
    const dogCol = b.includes('dog_id') ? 'dog_id' : (b.includes('dogId') ? 'dogId' : null)
    if (!ownerCol || !sitterCol || !dogCol) throw new Error('bookings 컬럼 확인 필요')

    // dogs
    const [dCols] = await connection.execute(`SHOW COLUMNS FROM dogs`)
    const d = dCols.map(c => c.Field)
    const dogPk = d.includes('id') ? 'id' : (d.includes('dog_id') ? 'dog_id' : null)
    const dogNameCol = d.includes('name') ? 'name' : (d.includes('dog_name') ? 'dog_name' : null)
    const dogPhotoCol = d.includes('photo_url') ? 'photo_url' : (d.includes('profile_image_url') ? 'profile_image_url' : null)
    if (!dogPk) throw new Error('dogs PK 컬럼 확인 필요')

    // users
    const [uCols] = await connection.execute(`SHOW COLUMNS FROM users`)
    const u = uCols.map(c => c.Field)
    const userPk = u.includes('user_id') ? 'user_id' : (u.includes('id') ? 'id' : null)
    const userEmail = u.includes('email') ? 'email' : 'email'
    if (!userPk) throw new Error('users PK 컬럼 확인 필요')

    const sql = `
      SELECT b.*, d.${dogNameCol || 'name'} AS dog_name,
             d.${dogPhotoCol || 'photo_url'} AS dog_photo_url,
             u.${userEmail} AS sitter_email
      FROM bookings b
      JOIN dogs d ON b.${dogCol} = d.${dogPk}
      JOIN users u ON b.${sitterCol} = u.${userPk}
      WHERE b.${ownerCol} = ?
      ORDER BY b.start_time ASC`
    const [rows] = await connection.execute(sql, [ownerId])
    connection.release()
    return rows
  } catch (error) {
    try { connection?.release() } catch {}
    console.error('예약 목록 조회 실패:', error)
    throw error
  }
}

// 시터의 예약 목록 조회 (시터 관점)
async function getBookingsBySitterId(sitterId) {
  try {
    const [rows] = await pool.execute(
      `SELECT b.*, d.name as dog_name, u.email as owner_email 
       FROM bookings b 
       JOIN dogs d ON b.dog_id = d.dog_id 
       JOIN users u ON b.owner_user_id = u.user_id 
       WHERE b.sitter_user_id = ? 
       ORDER BY b.start_time DESC`,
      [sitterId]
    )
    return rows
  } catch (error) {
    console.error('예약 목록 조회 실패:', error)
    throw error
  }
}

// 예약 상태 업데이트
async function updateBookingStatus(bookingId, status) {
  try {
    const [result] = await pool.execute(
      'UPDATE bookings SET booking_status = ? WHERE booking_id = ?',
      [status, bookingId]
    )
    
    return {
      success: result.affectedRows > 0,
      affectedRows: result.affectedRows
    }
  } catch (error) {
    console.error('예약 상태 업데이트 실패:', error)
    throw error
  }
}

// 연결 풀 종료 함수
async function closePool() {
  try {
    await pool.end()
    console.log('🔒 데이터베이스 연결 풀이 종료되었습니다.')
  } catch (error) {
    console.error('❌ 연결 풀 종료 실패:', error)
  }
}

// 모든 함수 내보내기
module.exports = {
  pool,
  testConnection,
  
  // Users
  findUserByEmail,
  findUserById,
  createUser,
  
  // Sitters
  createSitterProfile,
  getSitterByUserId,
  getAllSitters,
  
  // Dogs
  createDog,
  getDogsByUserId,
  deleteDogByIdOwner,
  
  // Dog Analyses
  async getLatestAnalysisByFilename(fileName) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM dog_analyses WHERE file_name LIKE ? ORDER BY created_at DESC LIMIT 1',
        [`%${fileName}%`]
      )
      return rows.length > 0 ? rows[0] : null
    } catch (error) {
      console.error('분석 결과 조회 실패:', error)
      throw error
    }
  },
  
  async getLatestAnalysisByS3Url(s3Url) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM dog_analyses WHERE s3_url = ? ORDER BY created_at DESC LIMIT 1',
        [s3Url]
      )
      return rows.length > 0 ? rows[0] : null
    } catch (error) {
      console.error('분석 결과 조회 실패:', error)
      throw error
    }
  },
  
  // Bookings
  createBooking,
  getBookingsByOwnerId,
  getBookingsBySitterId,
  updateBookingStatus,
 
  // Jobs (owner postings)
  async createJobPosting(job) {
    const { owner_id, dog_id, title, description, location, start_date, end_date, status = 'active' } = job
    try {
      const [result] = await pool.execute(
        `INSERT INTO job_postings (owner_id, dog_id, title, description, location, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [owner_id, dog_id, title, description || null, location || null, start_date, end_date, status]
      )
      return { success: true, jobId: result.insertId }
    } catch (e) {
      console.error('공고 생성 실패:', e)
      throw e
    }
  },
  async getAllActiveOwnerJobs() {
    try {
      const [rows] = await pool.execute(
        `SELECT jp.*, 
                u.full_name AS owner_name, u.email AS owner_email,
                d.name AS dog_name, d.breed AS dog_breed, d.photo_url AS dog_photo_url
         FROM job_postings jp
         JOIN users u ON jp.owner_id = u.id
         LEFT JOIN dogs d ON jp.dog_id = d.id
         WHERE jp.status = 'active'
         ORDER BY jp.created_at DESC`
      )
      return rows
    } catch (e) {
      console.error('공고 목록 조회 실패:', e)
      throw e
    }
  },

  async updateJobPostingStatus(jobId, status) {
    try {
      const [result] = await pool.execute(
        `UPDATE job_postings SET status = ? WHERE job_id = ?`,
        [status, jobId]
      )
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows }
    } catch (e) {
      console.error('공고 상태 업데이트 실패:', e)
      throw e
    }
  },
  
   // Sitter postings (full schema restore)
   async createSitterPosting(data) {
     const { sitter_id, title, description, location, available_from, available_to, status = 'active' } = data
     try {
       const [result] = await pool.execute(
         `INSERT INTO sitter_postings (sitter_id, title, description, location, available_from, available_to, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [sitter_id, title, description || null, location || null, available_from, available_to, status]
       )
       return { success: true, postId: result.insertId }
     } catch (error) {
       console.error('시터 공고 생성 실패:', error)
       throw error
     }
   },
   async getAllActiveSitterPostings() {
     try {
       const [rows] = await pool.execute(
         `SELECT sp.*, u.full_name AS sitter_name, u.email AS sitter_email
          FROM sitter_postings sp
          JOIN users u ON sp.sitter_id = u.id
          WHERE sp.status = 'active'
          ORDER BY sp.created_at DESC`
       )
       return rows
     } catch (error) {
       console.error('시터 공고 목록 조회 실패:', error)
       throw error
     }
   },
  
  closePool,
  dbConfig
}
