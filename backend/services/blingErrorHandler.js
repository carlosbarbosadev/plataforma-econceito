function parseBlingError(blingErrorData) {
    const errors = {};
    let message = blingErrorData?.error?.message || 'Erro de validação.';

    if (blingErrorData?.error?.fields && Array.isArray(blingErrorData.error.fields)) {

        for (const fieldError of blingErrorData.error.fields) {
            let fieldName = fieldError.element;

            const errorMsg = fieldError.msg;

            if (!fieldName || !errorMsg) {
                continue;
            }

            if (fieldName === 'cnpj' || fieldName === 'cpf') {
                fieldName = 'documento';
            }
            
            if (fieldName === 'cep') {
                fieldName = 'cep';
            }

            errors[fieldName] = errorMsg;
        }
    }

    if (Object.keys(errors).length > 0) {
        return { message, errors };
    }

    const fallbackMessage = blingErrorData?.error?.description || blingErrorData?.error?.message || 'Erro ao validar dados no Bling.';
    return { message: fallbackMessage };
}

module.exports = { parseBlingError };