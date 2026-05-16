// Transformer for inventory pools
export function transformPools(data) {
    if (!Array.isArray(data)) return [];

    return data.map((pool) => ({
        id: pool.id,
        name: pool.name,
        description: pool.description,
    }));
}

export default transformPools;

// Transform pools and flatten products with pool info
export function transformPoolsWithProducts(data) {
    if (!Array.isArray(data)) return { poolList: [], poolProductDetails: [] };

    const poolList = [];
    const poolProductDetails = [];

    data.forEach((pool, index) => {
        const poolInfo = {
            id: pool.id,
            name: pool.name,
            description: pool.description,
        };

        poolList.push(poolInfo);

        const flattenedProducts = (pool.productItems || []).map((item, subIndex) => ({
            ...item,
            ...poolInfo,
            _localId: `${index}-${subIndex}`,
        }));

        poolProductDetails.push(...flattenedProducts);
    });

    return { poolList, poolProductDetails };
}
