const { IndexedMerkleTree } = require('@jayanth-kumar-morem/indexed-merkle-tree');

async function debugTree() {
    console.log('🔍 Debugging IndexedMerkleTree...');
    
    try {
        // Create tree
        const tree = new IndexedMerkleTree();
        console.log(`Initial tree size: ${tree.size}`);
        console.log(`Initial tree root: ${tree.root}`);
        
        // Check initial leaves
        console.log('Initial leaves:', tree.getLeaves());
        
        // Try to insert first value
        console.log('Inserting first value: 100n');
        await tree.insert(100n);
        
        console.log(`Tree size after first insert: ${tree.size}`);
        console.log(`Tree root after first insert: ${tree.root}`);
        console.log('Leaves after first insert:', tree.getLeaves());
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugTree();
