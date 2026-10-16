
import React, { useState, useEffect, useMemo } from 'react';
import type { Quotation, InvoiceItem } from '../types.ts';

interface QuoteCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotation: Quotation | null;
    onCreateFinal: (finalData: Partial<Quotation>) => void;
}

const QuoteCalculatorModal: React.FC<QuoteCalculatorModalProps> = ({ isOpen, onClose, quotation, onCreateFinal }) => {
    const [selectedTiers, setSelectedTiers] = useState<Record<number, number>>({});

    useEffect(() => {
        if (quotation) {
            const initialTiers: Record<number, number> = {};
            quotation.items.forEach((item, index) => {
                // Default to first tier (index 0) if tiers exist, otherwise ignore
                if (item.pricingTiers && item.pricingTiers.length > 0) {
                    initialTiers[index] = 0;
                }
            });
            setSelectedTiers(initialTiers);
        }
    }, [quotation]);

    const calculateItemTotal = (item: InvoiceItem, index: number) => {
        if (item.pricingTiers && item.pricingTiers.length > 0) {
            const tierIndex = selectedTiers[index] !== undefined ? selectedTiers[index] : 0;
            const tier = item.pricingTiers[tierIndex];
            return tier ? tier.quantity * tier.price : 0;
        }
        return item.quantity * item.price;
    };

    const total = useMemo(() => {
        if (!quotation) return 0;
        return quotation.items.reduce((sum, item, index) => sum + calculateItemTotal(item, index), 0);
    }, [quotation, selectedTiers]);

    const handleTierChange = (itemIndex: number, tierIndex: number) => {
        setSelectedTiers(prev => ({ ...prev, [itemIndex]: tierIndex }));
    };

    const handleCreateFinal = () => {
        if (!quotation) return;

        const finalItems: InvoiceItem[] = quotation.items.map((item, index) => {
            // If item has tiers, use selected tier values and REMOVE tiers for the final quote
            if (item.pricingTiers && item.pricingTiers.length > 0) {
                const tierIndex = selectedTiers[index] !== undefined ? selectedTiers[index] : 0;
                const tier = item.pricingTiers[tierIndex];
                return {
                    ...item,
                    quantity: tier.quantity,
                    price: tier.price,
                    pricingTiers: undefined // Clear tiers
                };
            }
            // If no tiers, keep as is
            return item;
        });

        const finalData: Partial<Quotation> = {
            ...quotation,
            items: finalItems,
            total: total,
            notes: quotation.notes ? `${quotation.notes}\n\n(تم الإنشاء بناءً على اختيارات من العرض الأصل #${quotation.id})` : `(تم الإنشاء بناءً على اختيارات من العرض الأصل #${quotation.id})`
        };

        onCreateFinal(finalData);
        onClose();
    };

    if (!isOpen || !quotation) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800">حاسبة العرض / اختيار الكميات</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-4 text-sm text-gray-600">
                        قم باختيار الخيار المناسب لكل بند لحساب الإجمالي المتوقع، أو إنشاء عرض سعر نهائي بالكميات المختارة.
                    </div>

                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b">
                                <th className="p-3 border">البند</th>
                                <th className="p-3 border text-center">الخيارات المتاحة</th>
                                <th className="p-3 border text-center w-32">المختار</th>
                                <th className="p-3 border text-center w-32">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotation.items.map((item, index) => {
                                const hasTiers = item.pricingTiers && item.pricingTiers.length > 0;
                                const currentTotal = calculateItemTotal(item, index);

                                return (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-3 border align-top">
                                            <div className="font-bold">{item.productName}</div>
                                            {(item.size || item.variantName) && (
                                                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                    {item.size && <span className="bg-gray-100 px-1 rounded">مقاس: {item.size}</span>}
                                                    {item.variantName && <span className="text-red-600">{item.variantName}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border align-top">
                                            {hasTiers ? (
                                                <div className="flex flex-col gap-2">
                                                    {item.pricingTiers!.map((tier, tIndex) => (
                                                        <label key={tIndex} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${selectedTiers[index] === tIndex ? 'bg-blue-50 border-blue-200' : 'border-gray-100'}`}>
                                                            <input
                                                                type="radio"
                                                                name={`tier-${index}`}
                                                                checked={selectedTiers[index] === tIndex}
                                                                onChange={() => handleTierChange(index, tIndex)}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-sm">
                                                                <span className="font-bold">{tier.quantity}</span> وحدة بسعر <span className="font-bold">{Number(tier.price).toFixed(2)}</span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-gray-500 text-sm p-2">
                                                    {item.quantity} وحدة بسعر {item.price.toFixed(2)} (سعر ثابت)
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 border text-center align-middle font-bold text-blue-800">
                                            {hasTiers ? (
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    {item.pricingTiers![selectedTiers[index] || 0].quantity} <span className="text-xs font-normal text-gray-500">وحدة</span>
                                                </div>
                                            ) : (
                                                <div>{item.quantity}</div>
                                            )}
                                        </td>
                                        <td className="p-3 border text-center align-middle font-bold text-green-700">
                                            {currentTotal.toFixed(2)} ج.م
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-bold text-lg">
                                <td colSpan={3} className="p-4 text-center border-t border-gray-300">الإجمالي الكلي (للكميات المختارة):</td>
                                <td className="p-4 text-center border-t border-gray-300 text-blue-800">{total.toFixed(2)} ج.م</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                        إغلاق
                    </button>
                    <button
                        onClick={handleCreateFinal}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 flex items-center gap-2 shadow"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        إنشاء عرض نهائي بهذه الكميات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuoteCalculatorModal;
