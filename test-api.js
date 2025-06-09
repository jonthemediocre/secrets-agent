// Simple API test script
const baseUrl = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Secrets Agent API...\n');

  try {
    // Test 1: Register a user
    console.log('1. Testing user registration...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'user'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ User registration successful:', registerData.data.email);
      
      // Test 2: Create a vault
      console.log('\n2. Testing vault creation...');
      const vaultResponse = await fetch(`${baseUrl}/api/vault`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Vault',
          ownerId: registerData.data.id
        })
      });

      if (vaultResponse.ok) {
        const vaultData = await vaultResponse.json();
        console.log('✅ Vault creation successful:', vaultData.data.name);

        // Test 3: Create a secret
        console.log('\n3. Testing secret creation...');
        const secretResponse = await fetch(`${baseUrl}/api/secrets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vaultId: vaultData.data.id,
            key: 'API_KEY',
            value: 'super-secret-api-key-12345',
            metadata: {
              description: 'Test API key',
              environment: 'development'
            }
          })
        });

        if (secretResponse.ok) {
          const secretData = await secretResponse.json();
          console.log('✅ Secret creation successful:', secretData.data.key);

          // Test 4: List secrets
          console.log('\n4. Testing secrets listing...');
          const listResponse = await fetch(`${baseUrl}/api/secrets?vaultId=${vaultData.data.id}`);
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log('✅ Secrets listing successful:', listData.data.length, 'secrets found');

            // Test 5: Get specific secret
            console.log('\n5. Testing secret retrieval...');
            const getResponse = await fetch(`${baseUrl}/api/secrets/${secretData.data.id}`);
            
            if (getResponse.ok) {
              const getData = await getResponse.json();
              console.log('✅ Secret retrieval successful:', getData.data.key);
              console.log('   Decrypted value:', getData.data.value);
            } else {
              console.log('❌ Secret retrieval failed:', getResponse.status);
            }
          } else {
            console.log('❌ Secrets listing failed:', listResponse.status);
          }
        } else {
          console.log('❌ Secret creation failed:', secretResponse.status);
          const errorData = await secretResponse.json();
          console.log('   Error:', errorData.error);
        }
      } else {
        console.log('❌ Vault creation failed:', vaultResponse.status);
        const errorData = await vaultResponse.json();
        console.log('   Error:', errorData.error);
      }
    } else {
      console.log('❌ User registration failed:', registerResponse.status);
      const errorData = await registerResponse.json();
      console.log('   Error:', errorData.error);
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAPI(); 